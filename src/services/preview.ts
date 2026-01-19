import { ChildProcess, spawn, execSync } from 'child_process';
import * as net from 'net';

import { PreviewRepository } from '../repositories/preview.js';
import { PreviewInfo, WorkingDirectory } from '../types/database.js';
import { logger } from '../utils/logger.js';

/**
 * Tunnel 信息
 */
interface TunnelInfo {
  url: string;
  pid: number;
}

/**
 * 预览服务管理
 */
export class PreviewService {
  private projectProcesses: Map<string, ChildProcess> = new Map();
  private tunnelProcesses: Map<string, ChildProcess> = new Map();

  constructor(private previewRepo: PreviewRepository) {}

  /**
   * 清理僵尸预览记录（进程已不存在但数据库中还有记录）
   */
  async cleanupOrphanedPreviews(): Promise<void> {
    const previews = this.getStatus();
    let cleaned = 0;

    for (const preview of previews) {
      const projectExists = this.isProcessAlive(preview.pid);
      const tunnelExists = this.isProcessAlive(preview.tunnelPid);

      if (!projectExists || !tunnelExists) {
        logger.info(
          `[Preview ${preview.alias}] 检测到僵尸记录 (项目进程: ${projectExists ? '存在' : '不存在'}, Tunnel进程: ${tunnelExists ? '存在' : '不存在'})，正在清理...`
        );
        this.previewRepo.delete(preview.alias);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`已清理 ${cleaned} 个僵尸预览记录`);
    }
  }

  /**
   * 检查进程是否存在
   */
  private isProcessAlive(pid: number): boolean {
    try {
      if (process.platform === 'win32') {
        // Windows: 使用 tasklist 检查进程是否存在
        try {
          const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          });
          // 如果进程存在，输出会包含进程信息；不存在则输出 "INFO: No tasks..."
          return !output.includes('No tasks') && output.includes(String(pid));
        } catch {
          return false;
        }
      } else {
        // Unix/Linux/macOS: 发送信号 0 不会杀死进程，只是检查进程是否存在
        process.kill(pid, 0);
        return true;
      }
    } catch (e: any) {
      return e.code !== 'ESRCH';
    }
  }

  /**
   * 启动项目预览
   */
  async start(workingDir: WorkingDirectory): Promise<PreviewInfo> {
    const { alias, path, start_cmd, preview_port } = workingDir;

    // 检查是否已在运行
    const existing = this.previewRepo.findByAlias(alias);
    if (existing) {
      throw new Error(`预览服务已在运行: ${alias}`);
    }

    // 检查必需字段
    if (!start_cmd) {
      throw new Error(`未配置启动命令，请使用 /dir update ${alias} --start-cmd "命令"`);
    }

    const port = preview_port || 3000;

    // 检查端口是否可用
    const portAvailable = await this.isPortAvailable(port);
    if (!portAvailable) {
      // 检查端口是否被其他预览服务占用
      const portOwner = this.findPreviewByPort(port);
      if (portOwner) {
        logger.info(
          `[Preview ${alias}] 端口 ${port} 被预览服务 "${portOwner.alias}" 占用，正在重启...`
        );
        await this.stop(portOwner.alias);
        // 等待端口释放
        await this.waitForPortRelease(port, 5000);
      } else {
        throw new Error(
          `端口 ${port} 已被占用\n\n` +
            `解决方案：\n` +
            `1. 停止占用端口 ${port} 的进程\n` +
            `2. 修改预览端口: /d u ${alias} -po <新端口号>\n` +
            `   例如: /d u ${alias} -po 3001`
        );
      }
    }

    // 启动项目进程
    const projectProc = this.startProjectProcess(start_cmd, path, alias);
    this.projectProcesses.set(alias, projectProc);

    // 等待项目启动（检测端口监听）
    await this.waitForPort(port, 30000); // 30秒超时

    // 启动 Cloudflare Tunnel
    const tunnelInfo = await this.startTunnel(port, alias);
    this.tunnelProcesses.set(alias, tunnelInfo.process);

    // 保存到数据库
    const service = this.previewRepo.create({
      alias,
      pid: projectProc.pid!,
      tunnelPid: tunnelInfo.pid,
      port,
      tunnelUrl: tunnelInfo.url,
    });

    return this.previewRepo.toPreviewInfo(service);
  }

  /**
   * 停止预览
   */
  async stop(alias: string): Promise<void> {
    const service = this.previewRepo.findByAlias(alias);
    if (!service) {
      throw new Error(`预览服务不存在: ${alias}`);
    }

    // 停止进程
    this.killProcess(service.tunnel_pid, alias, 'tunnel');
    this.killProcess(service.pid, alias, 'project');

    // 清理内存中的引用
    const tunnelProc = this.tunnelProcesses.get(alias);
    if (tunnelProc && tunnelProc.pid) {
      this.killProcess(tunnelProc.pid, alias, 'tunnel');
      this.tunnelProcesses.delete(alias);
    }

    const projectProc = this.projectProcesses.get(alias);
    if (projectProc && projectProc.pid) {
      this.killProcess(projectProc.pid, alias, 'project');
      this.projectProcesses.delete(alias);
    }

    // 从数据库删除
    this.previewRepo.delete(alias);
  }

  /**
   * 停止所有预览
   */
  async stopAll(): Promise<void> {
    const services = this.previewRepo.findAll();
    for (const service of services) {
      try {
        await this.stop(service.alias);
      } catch (error) {
        logger.error(`停止预览失败 [${service.alias}]:`, error);
      }
    }
  }

  /**
   * 获取预览状态
   */
  getStatus(alias?: string): PreviewInfo[] {
    if (alias) {
      const service = this.previewRepo.findByAlias(alias);
      return service ? [this.previewRepo.toPreviewInfo(service)] : [];
    }
    const services = this.previewRepo.findAll();
    return services.map((s) => this.previewRepo.toPreviewInfo(s));
  }

  /**
   * 查找占用指定端口的预览服务
   */
  private findPreviewByPort(port: number): PreviewInfo | null {
    const services = this.previewRepo.findAll();
    const service = services.find((s) => s.port === port);
    return service ? this.previewRepo.toPreviewInfo(service) : null;
  }

  /**
   * 检查端口是否可用
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  /**
   * 等待端口释放
   */
  private waitForPortRelease(port: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 200; // 每200ms检查一次

      const check = async () => {
        const available = await this.isPortAvailable(port);
        if (available) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`等待端口 ${port} 释放超时`));
        } else {
          setTimeout(check, checkInterval);
        }
      };

      check();
    });
  }

  /**
   * 等待端口开始监听
   */
  private waitForPort(port: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 500; // 每500ms检查一次

      const check = () => {
        const socket = new net.Socket();
        socket.setTimeout(100);

        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });

        socket.on('timeout', () => {
          socket.destroy();
          checkAgain();
        });

        socket.on('error', () => {
          checkAgain();
        });

        socket.connect(port, '127.0.0.1');
      };

      const checkAgain = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`等待端口 ${port} 超时`));
        } else {
          setTimeout(check, checkInterval);
        }
      };

      check();
    });
  }

  /**
   * 启动项目进程
   */
  private startProjectProcess(cmd: string, cwd: string, alias: string): ChildProcess {
    logger.info(`[Preview ${alias}] 启动项目: ${cmd}`);

    // 使用 shell 执行整个命令字符串
    const proc = spawn(cmd, {
      cwd,
      shell: true,
    });

    // 日志输出到控制台
    if (proc.stdout) {
      proc.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach((line: string) => {
          logger.debug(`[Project ${alias}] ${line}`);
        });
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach((line: string) => {
          logger.warn(`[Project ${alias}] ${line}`);
        });
      });
    }

    proc.on('exit', (code: number | null) => {
      logger.info(`[Project ${alias}] 进程退出，代码: ${code}`);
      this.projectProcesses.delete(alias);
    });

    return proc;
  }

  /**
   * 启动 Cloudflare Tunnel
   */
  private async startTunnel(port: number, alias: string): Promise<TunnelInfo & { process: ChildProcess }> {
    logger.info(`[Preview ${alias}] 启动 Cloudflare Tunnel...`);

    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // 从输出解析 URL
    return new Promise((resolve, reject) => {
      let resolved = false;

      const onData = (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          // 输出日志
          if (line.trim()) {
            logger.debug(`[Tunnel ${alias}] ${line.trim()}`);
          }

          // 解析 URL
          const url = this.parseTunnelUrl(line);
          if (url && !resolved) {
            resolved = true;
            resolve({ url, pid: proc.pid!, process: proc });
          }
        }
      };

      proc.stdout?.on('data', onData);
      proc.stderr?.on('data', onData);

      proc.on('exit', (code) => {
        logger.info(`[Tunnel ${alias}] 进程退出，代码: ${code}`);
        this.tunnelProcesses.delete(alias);
        if (!resolved) {
          reject(new Error('Cloudflare Tunnel 意外退出'));
        }
      });

      // 30秒超时
      setTimeout(() => {
        if (!resolved) {
          proc.kill();
          reject(new Error('Cloudflare Tunnel 启动超时 (30s)'));
        }
      }, 30000);
    });
  }

  /**
   * 从 tunnel 输出解析 URL
   */
  private parseTunnelUrl(output: string): string | null {
    // cloudflared 输出格式：https://xxx.trycloudflare.com
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    return match ? match[0] : null;
  }

  /**
   * 杀死进程
   */
  private killProcess(pid: number, alias: string, type: 'project' | 'tunnel'): void {
    try {
      if (process.platform === 'win32') {
        // Windows: 使用 taskkill 强制终止进程树
        // /F: 强制终止, /T: 终止进程树（包括子进程）, /PID: 指定进程ID
        try {
          execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
          logger.info(`[Preview ${alias}] 已停止 ${type} 进程树 (PID: ${pid})`);
        } catch (killError: any) {
          // 如果进程不存在，taskkill 会返回错误，这是正常情况
          if (killError.status === 128) {
            logger.debug(`[Preview ${alias}] ${type} 进程 ${pid} 已经不存在，跳过清理`);
          } else {
            logger.warn(`[Preview ${alias}] taskkill 执行失败 (PID ${pid}):`, killError.message);
          }
        }
      } else {
        // Unix/Linux/macOS: 使用 SIGTERM 信号
        process.kill(pid, 'SIGTERM');
        logger.info(`[Preview ${alias}] 已停止 ${type} 进程 (PID: ${pid})`);
      }
    } catch (e: any) {
      // ESRCH 表示进程不存在，这是正常情况（可能已经被手动停止）
      if (e.code === 'ESRCH') {
        logger.debug(`[Preview ${alias}] ${type} 进程 ${pid} 已经不存在，跳过清理`);
      } else {
        logger.warn(`[Preview ${alias}] 无法杀死 ${type} 进程 ${pid}:`, e);
      }
    }
  }
}
