import { WorkingDirectoryRepository } from '../repositories/working-directory.js';
import { PreviewService } from '../services/preview.js';
import { DingTalkNotifier } from '../services/notifier.js';
import { WorkingDirectory } from '../types/database.js';
import { logger } from '../utils/logger.js';
import { PathValidator } from '../utils/path.js';
import { HELP_TEXT } from '../constants/help.js';

/**
 * 命令处理结果
 */
export interface CommandResult {
  success: boolean;
  message: string;
}

/**
 * 命令处理器 - 处理通过钉钉消息发送的命令
 */
export class CommandHandler {
  private pathValidator: PathValidator;
  private webhookUrl?: string;

  constructor(
    private workingDirRepo: WorkingDirectoryRepository,
    private previewService: PreviewService,
    allowedRootDir: string
  ) {
    this.pathValidator = new PathValidator(allowedRootDir);
  }

  /**
   * 设置 Webhook URL（用于异步通知）
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }

  /**
   * 检查消息是否为命令
   */
  isCommand(content: string): boolean {
    return content.trim().startsWith('/');
  }

  /**
   * 处理命令（个人使用，无需 conversationId）
   */
  async handle(content: string): Promise<CommandResult> {
    const trimmed = content.trim();
    const parts = this.parseCommand(trimmed);
    const command = parts[0].toLowerCase();

    logger.info(`执行命令: ${command}, 参数: ${JSON.stringify(parts.slice(1))}`);

    try {
      switch (command) {
        case '/help':
        case '/h':
          return this.handleHelp();
        case '/dir':
        case '/d':
          return this.handleDirCommand(parts.slice(1));
        case '/preview':
        case '/p':
          return await this.handlePreviewCommand(parts.slice(1));
        default:
          return {
            success: false,
            message: `未知命令: ${command}\n使用 /h 查看帮助`,
          };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`命令执行失败: ${errorMsg}`);
      return {
        success: false,
        message: `执行失败: ${errorMsg}`,
      };
    }
  }

  /**
   * 解析命令和参数
   */
  private parseCommand(content: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * 处理帮助命令
   */
  private handleHelp(): CommandResult {
    return {
      success: true,
      message: HELP_TEXT.trim(),
    };
  }

  /**
   * 处理 /dir 命令
   */
  private handleDirCommand(args: string[]): CommandResult {
    if (args.length === 0) {
      return {
        success: false,
        message: '请指定子命令: a(dd), ls(list), i(nfo), d(efault), u(pdate), rm(remove)',
      };
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'add':
      case 'a':
        return this.handleDirAdd(args.slice(1));
      case 'list':
      case 'ls':
        return this.handleDirList();
      case 'info':
      case 'i':
        return this.handleDirInfo(args.slice(1));
      case 'set-default':
      case 'default':
      case 'd':
        return this.handleDirSetDefault(args.slice(1));
      case 'update':
      case 'u':
        return this.handleDirUpdate(args.slice(1));
      case 'remove':
      case 'rm':
        return this.handleDirRemove(args.slice(1));
      default:
        return {
          success: false,
          message: `未知子命令: ${subCommand}`,
        };
    }
  }

  /**
   * 添加工作目录
   */
  private handleDirAdd(args: string[]): CommandResult {
    if (args.length < 2) {
      return {
        success: false,
        message: '用法: /d a <别名> <路径> [选项]\n选项:\n  -desc "描述"\n  -p\n  -cmd "命令"\n  -po 端口号\n  -d',
      };
    }

    const alias = args[0];
    const path = args[1];

    // 验证路径安全性
    const validation = this.pathValidator.validate(path);
    if (!validation.valid) {
      return {
        success: false,
        message: `路径验证失败: ${validation.error}`,
      };
    }

    // 检查别名是否已存在
    const existing = this.workingDirRepo.findByAlias(alias);
    if (existing) {
      return {
        success: false,
        message: `别名 "${alias}" 已存在`,
      };
    }

    // 解析选项
    let description: string | undefined;
    let previewEnabled = false;
    let startCmd: string | undefined;
    let previewPort: number | undefined;
    let isDefault = false;

    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--preview' || arg === '-p') {
        previewEnabled = true;
      } else if (arg === '--default' || arg === '-d') {
        isDefault = true;
      } else if ((arg === '--description' || arg === '-desc') && i + 1 < args.length) {
        description = args[i + 1];
        i++;
      } else if ((arg === '--start-cmd' || arg === '-cmd') && i + 1 < args.length) {
        startCmd = args[i + 1];
        i++;
      } else if ((arg === '--port' || arg === '-po') && i + 1 < args.length) {
        previewPort = parseInt(args[i + 1], 10);
        i++;
      }
    }

    // 创建工作目录（使用标准化后的路径）
    const dir = this.workingDirRepo.create({
      alias,
      path: validation.normalizedPath!,
      isDefault,
      previewEnabled,
      startCmd,
      previewPort,
      description,
    });

    const features: string[] = [];
    if (dir.is_default) features.push('默认');
    if (dir.preview_enabled) features.push('预览');
    if (dir.start_cmd) features.push(`启动命令: ${dir.start_cmd}`);
    if (dir.preview_port) features.push(`端口: ${dir.preview_port}`);

    return {
      success: true,
      message: `✅ 已添加工作目录
- 别名: ${dir.alias}
- 路径: ${dir.path}
${dir.description ? `- 描述: ${dir.description}\n` : ''}- 特性: ${features.join(', ') || '无'}`,
    };
  }

  /**
   * 列出所有工作目录
   */
  private handleDirList(): CommandResult {
    const dirs = this.workingDirRepo.findAll();

    if (dirs.length === 0) {
      return {
        success: true,
        message: '📁 暂无配置的工作目录\n使用 /dir add 添加',
      };
    }

    let message = '📁 工作目录列表\n\n';

    for (const dir of dirs) {
      const flags: string[] = [];
      if (dir.is_default) flags.push('默认');
      if (dir.preview_enabled) flags.push('预览');

      message += `**${dir.alias}** ${flags.length > 0 ? `[${flags.join(', ')}]` : ''}\n`;
      message += `路径: ${dir.path}\n`;
      if (dir.description) {
        message += `描述: ${dir.description}\n`;
      }
      message += '\n';
    }

    return {
      success: true,
      message: message.trim(),
    };
  }

  /**
   * 查看目录详情
   */
  private handleDirInfo(args: string[]): CommandResult {
    if (args.length === 0) {
      return {
        success: false,
        message: '用法: /d i <别名>',
      };
    }

    const alias = args[0];
    const dir = this.workingDirRepo.findByAlias(alias);

    if (!dir) {
      return {
        success: false,
        message: `未找到别名: ${alias}`,
      };
    }

    const createdAt = new Date(dir.created_at).toLocaleString('zh-CN');
    const updatedAt = new Date(dir.updated_at).toLocaleString('zh-CN');

    return {
      success: true,
      message: `📁 工作目录详情

**别名**: ${dir.alias}
**路径**: ${dir.path}
${dir.description ? `**描述**: ${dir.description}\n` : ''}**默认目录**: ${dir.is_default ? '是' : '否'}
**预览功能**: ${dir.preview_enabled ? '启用' : '禁用'}
${dir.preview_enabled && dir.start_cmd ? `**启动命令**: ${dir.start_cmd}\n` : ''}${dir.preview_enabled && dir.preview_port ? `**预览端口**: ${dir.preview_port}\n` : ''}**创建时间**: ${createdAt}
**更新时间**: ${updatedAt}`,
    };
  }

  /**
   * 设置默认目录
   */
  private handleDirSetDefault(args: string[]): CommandResult {
    if (args.length === 0) {
      return {
        success: false,
        message: '用法: /d d <别名>',
      };
    }

    const alias = args[0];
    const dir = this.workingDirRepo.findByAlias(alias);

    if (!dir) {
      return {
        success: false,
        message: `未找到别名: ${alias}`,
      };
    }

    this.workingDirRepo.setDefault(alias);

    return {
      success: true,
      message: `✅ 已将 "${alias}" 设为默认目录`,
    };
  }

  /**
   * 更新目录配置
   */
  private handleDirUpdate(args: string[]): CommandResult {
    if (args.length < 2) {
      return {
        success: false,
        message: '用法: /d u <别名> [选项]\n选项:\n  -desc "描述"\n  -p on|off\n  -cmd "命令"\n  -po 端口号',
      };
    }

    const alias = args[0];
    const dir = this.workingDirRepo.findByAlias(alias);

    if (!dir) {
      return {
        success: false,
        message: `未找到别名: ${alias}`,
      };
    }

    // 解析选项
    let description: string | undefined;
    let previewEnabled: boolean | undefined;
    let startCmd: string | undefined;
    let previewPort: number | undefined;

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if ((arg === '--description' || arg === '-desc') && i + 1 < args.length) {
        description = args[i + 1];
        i++;
      } else if ((arg === '--preview' || arg === '-p') && i + 1 < args.length) {
        const value = args[i + 1].toLowerCase();
        previewEnabled = value === 'on' || value === 'true' || value === '1';
        i++;
      } else if ((arg === '--start-cmd' || arg === '-cmd') && i + 1 < args.length) {
        startCmd = args[i + 1];
        i++;
      } else if ((arg === '--port' || arg === '-po') && i + 1 < args.length) {
        previewPort = parseInt(args[i + 1], 10);
        i++;
      }
    }

    const updated = this.workingDirRepo.update(alias, {
      description,
      previewEnabled,
      startCmd,
      previewPort,
    });

    if (!updated) {
      return {
        success: false,
        message: '更新失败：没有可更新的字段',
      };
    }

    return {
      success: true,
      message: `✅ 已更新 "${alias}" 的配置`,
    };
  }

  /**
   * 删除目录
   */
  private handleDirRemove(args: string[]): CommandResult {
    if (args.length === 0) {
      return {
        success: false,
        message: '用法: /d rm <别名>',
      };
    }

    const alias = args[0];
    const deleted = this.workingDirRepo.delete(alias);

    if (!deleted) {
      return {
        success: false,
        message: `未找到别名: ${alias}`,
      };
    }

    return {
      success: true,
      message: `✅ 已删除工作目录 "${alias}"`,
    };
  }

  /**
   * 处理预览命令
   */
  private async handlePreviewCommand(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: false,
        message: '用法: /p <s(tart)|x(stop)|xa(stop-all)|st(atus)> [别名]',
      };
    }

    const subcommand = args[0].toLowerCase();

    switch (subcommand) {
      case 'start':
      case 's':
        return await this.handlePreviewStart(args.slice(1));
      case 'stop':
      case 'x':
        return await this.handlePreviewStop(args.slice(1));
      case 'stop-all':
      case 'xa':
        return await this.handlePreviewStopAll();
      case 'status':
      case 'st':
        return this.handlePreviewStatus(args.slice(1));
      default:
        return {
          success: false,
          message: `未知预览子命令: ${subcommand}\n可用命令: s(tart), x(stop), xa(stop-all), st(atus)`,
        };
    }
  }

  /**
   * 启动预览
   */
  private async handlePreviewStart(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: false,
        message: '用法: /p s <别名>',
      };
    }

    const alias = args[0];
    const workingDir = this.workingDirRepo.findByAlias(alias);

    if (!workingDir) {
      return {
        success: false,
        message: `未找到别名: ${alias}`,
      };
    }

    // 立即返回
    const immediateResult = {
      success: true,
      message: `🚀 预览服务正在启动...\n\n别名: ${alias}\n请稍候，启动完成后将发送预览链接`,
    };

    // 异步执行启动流程（不阻塞）
    this.startPreviewAsync(workingDir, this.webhookUrl).catch((err) => {
      logger.error('[PreviewStart] 后台启动失败:', err);
    });

    return immediateResult;
  }

  /**
   * 异步启动预览（后台执行）
   */
  private async startPreviewAsync(
    workingDir: WorkingDirectory,
    webhookUrl?: string
  ): Promise<void> {
    const notifier = new DingTalkNotifier(webhookUrl || '');

    try {
      logger.info(`[PreviewStart] 开始启动预览: ${workingDir.alias}`);
      const info = await this.previewService.start(workingDir);
      await notifier.notifyPreviewStarted(info);
      logger.info(`[PreviewStart] 预览启动成功: ${workingDir.alias}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[PreviewStart] 预览启动失败: ${workingDir.alias}`, errorMsg);
      await notifier.notifyPreviewStartFailed(workingDir.alias, errorMsg);
    }
  }

  /**
   * 停止预览
   */
  private async handlePreviewStop(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: false,
        message: '用法: /p x <别名>',
      };
    }

    const alias = args[0];

    try {
      await this.previewService.stop(alias);
      return {
        success: true,
        message: `✅ 已停止预览服务 "${alias}"`,
      };
    } catch (error) {
      return {
        success: false,
        message: `停止失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 停止所有预览
   */
  private async handlePreviewStopAll(): Promise<CommandResult> {
    try {
      await this.previewService.stopAll();
      return {
        success: true,
        message: '✅ 已停止所有预览服务',
      };
    } catch (error) {
      return {
        success: false,
        message: `停止失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 查看预览状态
   */
  private handlePreviewStatus(args: string[]): CommandResult {
    const alias = args.length > 0 ? args[0] : undefined;
    const services = this.previewService.getStatus(alias);

    if (services.length === 0) {
      return {
        success: true,
        message: alias ? `未找到预览服务: ${alias}` : '当前没有运行中的预览服务',
      };
    }

    const statusLines = services.map((s) => {
      const startedAt = new Date(s.startedAt).toLocaleString('zh-CN');
      return `**${s.alias}**\n端口: ${s.port}\nURL: ${s.tunnelUrl}\n进程 PID: ${s.pid}\nTunnel PID: ${s.tunnelPid}\n启动时间: ${startedAt}`;
    });

    return {
      success: true,
      message: `📊 预览服务状态\n\n${statusLines.join('\n\n')}`,
    };
  }
}
