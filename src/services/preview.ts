import { ChildProcess, spawn } from 'child_process';
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
      throw new Error(`端口 ${port} 已被占用`);
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
    if (tunnelProc) {
      tunnelProc.kill('SIGTERM');
      this.tunnelProcesses.delete(alias);
    }

    const projectProc = this.projectProcesses.get(alias);
    if (projectProc) {
      projectProc.kill('SIGTERM');
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
      process.kill(pid, 'SIGTERM');
      logger.info(`[Preview ${alias}] 已停止 ${type} 进程 (PID: ${pid})`);
    } catch (e) {
      logger.warn(`[Preview ${alias}] 无法杀死 ${type} 进程 ${pid}:`, e);
    }
  }
}
