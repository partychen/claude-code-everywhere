import { WorkingDirectoryRepository } from '../repositories/working-directory.js';
import { ChatConversationRepository } from '../repositories/chat-conversation.js';
import { PreviewService } from '../services/preview.js';
import { DingTalkNotifier } from '../services/notifier.js';
import { WorkingDirectory } from '../types/database.js';
import { logger } from '../utils/logger.js';
import { PathValidator } from '../utils/path.js';
import { IntentRecognition } from '../services/llm/intent-recognizer.js';
import { HELP_TEXT } from '../constants/prompts.js';

/**
 * 操作处理器 - 处理各种意图操作
 */
export class OperationHandlers {
  constructor(
    private workingDirRepo: WorkingDirectoryRepository,
    private chatRepo: ChatConversationRepository,
    private previewService: PreviewService,
    private pathValidator: PathValidator
  ) {}

  /**
   * 添加工作目录
   */
  async handleDirAdd(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias, path, description, previewEnabled, startCmd, previewPort, isDefault } = intent;

    if (!alias || !path) {
      await notifier.notifyError('缺少必需参数：别名和路径');
      return { text: '参数不足' };
    }

    const validation = this.pathValidator.validate(path);
    if (!validation.valid) {
      await notifier.notifyError(`路径验证失败: ${validation.error}`);
      return { text: '路径验证失败' };
    }

    const existing = this.workingDirRepo.findByAlias(alias);
    if (existing) {
      await notifier.notifyError(`别名 "${alias}" 已存在`);
      return { text: '别名已存在' };
    }

    const dir = this.workingDirRepo.create({
      alias,
      path: validation.normalizedPath!,
      isDefault: isDefault || false,
      previewEnabled: previewEnabled || false,
      startCmd,
      previewPort,
      description,
    });

    const features: string[] = [];
    if (dir.is_default) features.push('默认');
    if (dir.preview_enabled) features.push('预览');
    if (dir.start_cmd) features.push(`启动命令: ${dir.start_cmd}`);
    if (dir.preview_port) features.push(`端口: ${dir.preview_port}`);

    const message = `✅ 已添加工作目录
- 别名: ${dir.alias}
- 路径: ${dir.path}
${dir.description ? `- 描述: ${dir.description}\n` : ''}- 特性: ${features.join(', ') || '无'}`;

    await notifier.sendMarkdown('添加目录成功', message);
    return { text: '添加目录成功' };
  }

  /**
   * 列出所有工作目录
   */
  async handleDirList(notifier: DingTalkNotifier): Promise<{ text: string }> {
    const dirs = this.workingDirRepo.findAll();

    if (dirs.length === 0) {
      await notifier.sendMarkdown('工作目录列表', '📁 暂无配置的工作目录');
      return { text: '目录列表为空' };
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

    await notifier.sendMarkdown('工作目录列表', message.trim());
    return { text: '目录列表已发送' };
  }

  /**
   * 查看目录详情
   */
  async handleDirInfo(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    const dir = this.workingDirRepo.findByAlias(alias);
    if (!dir) {
      await notifier.notifyError(`未找到别名: ${alias}`);
      return { text: '未找到目录' };
    }

    const createdAt = new Date(dir.created_at).toLocaleString('zh-CN');
    const updatedAt = new Date(dir.updated_at).toLocaleString('zh-CN');

    const message = `📁 工作目录详情

**别名**: ${dir.alias}
**路径**: ${dir.path}
${dir.description ? `**描述**: ${dir.description}\n` : ''}**默认目录**: ${dir.is_default ? '是' : '否'}
**预览功能**: ${dir.preview_enabled ? '启用' : '禁用'}
${dir.preview_enabled && dir.start_cmd ? `**启动命令**: ${dir.start_cmd}\n` : ''}${dir.preview_enabled && dir.preview_port ? `**预览端口**: ${dir.preview_port}\n` : ''}**创建时间**: ${createdAt}
**更新时间**: ${updatedAt}`;

    await notifier.sendMarkdown('目录详情', message);
    return { text: '目录详情已发送' };
  }

  /**
   * 更新目录配置
   */
  async handleDirUpdate(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias, description, previewEnabled, startCmd, previewPort } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    const dir = this.workingDirRepo.findByAlias(alias);
    if (!dir) {
      await notifier.notifyError(`未找到别名: ${alias}`);
      return { text: '未找到目录' };
    }

    const updated = this.workingDirRepo.update(alias, {
      description,
      previewEnabled,
      startCmd,
      previewPort,
    });

    if (!updated) {
      await notifier.notifyError('更新失败：没有可更新的字段');
      return { text: '更新失败' };
    }

    await notifier.sendText(`✅ 已更新 "${alias}" 的配置`);
    return { text: '更新成功' };
  }

  /**
   * 删除目录
   */
  async handleDirDelete(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    const deleted = this.workingDirRepo.delete(alias);
    if (!deleted) {
      await notifier.notifyError(`未找到别名: ${alias}`);
      return { text: '未找到目录' };
    }

    await notifier.sendText(`✅ 已删除工作目录 "${alias}"`);
    return { text: '删除成功' };
  }

  /**
   * 设置默认目录
   */
  async handleDirSetDefault(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    const dir = this.workingDirRepo.findByAlias(alias);
    if (!dir) {
      await notifier.notifyError(`未找到别名: ${alias}`);
      return { text: '未找到目录' };
    }

    this.workingDirRepo.setDefault(alias);
    await notifier.sendText(`✅ 已将 "${alias}" 设为默认目录`);
    return { text: '设置成功' };
  }

  /**
   * 启动预览
   */
  async handlePreviewStart(
    intent: IntentRecognition,
    notifier: DingTalkNotifier,
    webhookUrl?: string
  ): Promise<{ text: string }> {
    const { alias } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    const workingDir = this.workingDirRepo.findByAlias(alias);
    if (!workingDir) {
      await notifier.notifyError(`未找到别名: ${alias}`);
      return { text: '未找到目录' };
    }

    await notifier.sendText(`🚀 预览服务正在启动...\n\n别名: ${alias}\n请稍候，启动完成后将发送预览链接`);

    this.startPreviewAsync(workingDir, webhookUrl).catch((err) => {
      logger.error('[PreviewStart] 后台启动失败:', err);
    });

    return { text: '预览启动中' };
  }

  /**
   * 异步启动预览
   */
  private async startPreviewAsync(workingDir: WorkingDirectory, webhookUrl?: string): Promise<void> {
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
  async handlePreviewStop(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    try {
      await this.previewService.stop(alias);
      await notifier.sendText(`✅ 已停止预览服务 "${alias}"`);
      return { text: '停止成功' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await notifier.notifyError(`停止失败: ${errorMsg}`);
      return { text: '停止失败' };
    }
  }

  /**
   * 停止所有预览
   */
  async handlePreviewStopAll(notifier: DingTalkNotifier): Promise<{ text: string }> {
    try {
      await this.previewService.stopAll();
      await notifier.sendText('✅ 已停止所有预览服务');
      return { text: '停止成功' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await notifier.notifyError(`停止失败: ${errorMsg}`);
      return { text: '停止失败' };
    }
  }

  /**
   * 查看预览状态
   */
  async handlePreviewStatus(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const alias = intent.alias || undefined;
    const services = this.previewService.getStatus(alias);

    if (services.length === 0) {
      await notifier.sendText(alias ? `未找到预览服务: ${alias}` : '当前没有运行中的预览服务');
      return { text: '无预览服务' };
    }

    const statusLines = services.map((s) => {
      const startedAt = new Date(s.startedAt).toLocaleString('zh-CN');
      return `**${s.alias}**\n端口: ${s.port}\nURL: ${s.tunnelUrl}\n进程 PID: ${s.pid}\nTunnel PID: ${s.tunnelPid}\n启动时间: ${startedAt}`;
    });

    await notifier.sendMarkdown('预览服务状态', `📊 预览服务状态\n\n${statusLines.join('\n\n')}`);
    return { text: '状态已发送' };
  }

  /**
   * 查看聊天历史
   */
  async handleHistoryView(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias, limit } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    const conversations = this.chatRepo.findRecentByAlias(alias, limit || 10);

    if (conversations.length === 0) {
      await notifier.sendText(`📝 "${alias}" 暂无聊天历史`);
      return { text: '无历史记录' };
    }

    let message = `📝 "${alias}" 聊天历史（最近 ${conversations.length} 条）\n\n`;
    for (const conv of conversations) {
      const timestamp = new Date(conv.created_at).toLocaleString('zh-CN');
      message += `**[${timestamp}]**\n`;
      message += `👤 用户: ${conv.user_message}\n`;
      message += `🤖 助手: ${conv.assistant_message.substring(0, 100)}${conv.assistant_message.length > 100 ? '...' : ''}\n\n`;
    }

    await notifier.sendMarkdown('聊天历史', message.trim());
    return { text: '历史已发送' };
  }

  /**
   * 清空聊天历史
   */
  async handleHistoryClear(intent: IntentRecognition, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { alias } = intent;

    if (!alias) {
      await notifier.notifyError('缺少参数：别名');
      return { text: '参数不足' };
    }

    this.chatRepo.deleteByAlias(alias);
    await notifier.sendText(`✅ 已清空 "${alias}" 的聊天历史`);
    return { text: '清空成功' };
  }

  /**
   * 查看系统信息
   */
  async handleSystemInfo(notifier: DingTalkNotifier): Promise<{ text: string }> {
    const packageJson = await import('../../package.json', { assert: { type: 'json' } });
    const version = packageJson.default.version;

    const message = `ℹ️ 系统信息

**版本**: ${version}
**Node.js**: ${process.version}
**平台**: ${process.platform}
**架构**: ${process.arch}`;

    await notifier.sendMarkdown('系统信息', message);
    return { text: '系统信息已发送' };
  }

  /**
   * 健康检查
   */
  async handleSystemHealth(notifier: DingTalkNotifier): Promise<{ text: string }> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    const message = `💚 系统健康检查

**状态**: ${health.status}
**运行时间**: ${Math.floor(health.uptime / 60)} 分钟
**内存使用**: ${Math.floor(health.memory.heapUsed / 1024 / 1024)} MB / ${Math.floor(health.memory.heapTotal / 1024 / 1024)} MB`;

    await notifier.sendMarkdown('健康检查', message);
    return { text: '健康检查已发送' };
  }

  /**
   * 查看帮助
   */
  async handleHelp(notifier: DingTalkNotifier): Promise<{ text: string }> {
    await notifier.sendMarkdown('使用说明', HELP_TEXT.trim());
    return { text: '帮助已发送' };
  }
}
