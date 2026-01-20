import { DWClientDownStream } from 'dingtalk-stream';
import { WorkingDirectoryRepository } from '../repositories/working-directory.js';
import { ChatConversationRepository } from '../repositories/chat-conversation.js';
import { executeTask } from '../services/agent.js';
import { DingTalkNotifier } from '../services/notifier.js';
import { PreviewService } from '../services/preview.js';
import { AppState } from '../state.js';
import { WorkingDirectory } from '../types/database.js';
import { logger } from '../utils/logger.js';
import { IntentRecognizer, IntentRecognition, OperationType } from '../services/llm-intent.js';
import { LLMFactory, LLMConfig } from '../services/llm-factory.js';
import { createPendingAction, PendingAction } from '../services/confirmation.js';
import { PathValidator } from '../utils/path.js';
import { OperationHandlers } from './operation-handlers.js';

interface ResolvedWorkingDir {
  path: string;
  config?: WorkingDirectory;
}

interface TaskParams {
  prompt: string;
  workingDir: string;
  newSession: boolean;
  dirConfig?: WorkingDirectory;
}

export class MessageHandler {
  private intentRecognizer: IntentRecognizer;
  private handlers: OperationHandlers;

  constructor(
    private state: AppState,
    private workingDirRepo: WorkingDirectoryRepository,
    chatRepo: ChatConversationRepository,
    private previewService: PreviewService,
    allowedRootDir: string,
    llmConfig: LLMConfig
  ) {
    const pathValidator = new PathValidator(allowedRootDir);
    this.handlers = new OperationHandlers(workingDirRepo, chatRepo, previewService, pathValidator);

    const llm = LLMFactory.createLLM(llmConfig);
    const confidenceThreshold = process.env.INTENT_CONFIDENCE_THRESHOLD
      ? parseFloat(process.env.INTENT_CONFIDENCE_THRESHOLD)
      : 0.8;
    this.intentRecognizer = new IntentRecognizer(llm, confidenceThreshold);
  }

  /**
   * 处理钉钉机器人消息
   */
  async handle(event: DWClientDownStream): Promise<{ text: string }> {
    const data = JSON.parse(event.data);
    const messageId = event.headers?.messageId || data.msgId || '';
    const content = data.text?.content?.trim() || '';
    const webhookUrl = data.sessionWebhook;

    const notifier = new DingTalkNotifier(webhookUrl);

    // 消息去重
    if (messageId && this.state.isMessageProcessed(messageId)) {
      logger.info(`跳过重复消息: ${messageId}`);
      return { text: '消息已处理' };
    }

    if (messageId) {
      this.state.markMessageProcessed(messageId);
    }

    logger.info(`收到消息: ${content}`);

    // 验证消息内容
    if (!content) {
      return { text: '请输入任务内容' };
    }

    // 提取用户和会话ID
    const userId = data.senderStaffId || data.senderId || 'unknown';
    const conversationId = data.conversationId || data.chatId || 'default';

    // 1. 检查是否是确认响应
    const pendingAction = this.state.confirmationManager.getPending(conversationId, userId);
    if (pendingAction) {
      return await this.handleConfirmationResponse(
        content,
        pendingAction,
        conversationId,
        userId,
        notifier
      );
    }

    // 2. 所有操作通过 AI 意图识别处理（不再区分命令）

    // 3. 检查是否有任务在执行
    if (this.state.hasCurrentTask()) {
      const currentTask = this.state.getCurrentTask()!;
      logger.info('任务繁忙，拒绝新任务');
      await notifier.notifyTaskBusy(currentTask);
      return { text: '任务繁忙' };
    }

    // 4. 使用 AI 意图识别处理所有消息
    try {
      const intent = await this.intentRecognizer.recognize(content);

      // 需要确认?
      if (intent.needsConfirmation) {
        const action = createPendingAction(userId, conversationId, intent);
        this.state.confirmationManager.setPending(action);
        await notifier.sendText(
          intent.confirmMessage || '请确认是否继续执行？(回复"确认"或"取消")'
        );
        return { text: '等待用户确认' };
      }

      // 直接执行
      return await this.executeIntent(intent, notifier, data.sessionWebhook);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('AI 意图识别失败:', errorMsg);
      await notifier.notifyError(`意图识别失败: ${errorMsg}`);
      return { text: '意图识别失败' };
    }
  }

  /**
   * 处理确认响应
   */
  private async handleConfirmationResponse(
    content: string,
    pendingAction: PendingAction,
    conversationId: string,
    userId: string,
    notifier: DingTalkNotifier
  ): Promise<{ text: string }> {
    const confirmKeywords = ['确认', '是', '好的', 'yes', 'ok', '继续', '执行'];
    const cancelKeywords = ['取消', '否', '不', 'no', 'cancel', '算了'];

    const normalized = content.toLowerCase().trim();
    const isConfirm = confirmKeywords.some((kw) => normalized.includes(kw));
    const isCancel = cancelKeywords.some((kw) => normalized.includes(kw));

    if (isConfirm) {
      // 确认并执行
      this.state.confirmationManager.confirm(conversationId, userId);
      await notifier.sendText('✅ 已确认，开始执行...');
      return await this.executeIntent(pendingAction.intent, notifier);
    } else if (isCancel) {
      // 取消
      this.state.confirmationManager.cancel(conversationId, userId);
      await notifier.sendText('❌ 已取消操作');
      return { text: '已取消' };
    } else {
      // 无效响应
      await notifier.sendText('⚠️ 请回复"确认"继续执行，或"取消"放弃操作');
      return { text: '等待有效确认' };
    }
  }

  /**
   * 执行意图（根据操作类型调用对应的处理器）
   */
  private async executeIntent(
    intent: IntentRecognition,
    notifier: DingTalkNotifier,
    webhookUrl?: string
  ): Promise<{ text: string }> {
    logger.info(`执行意图: ${intent.operationType}`);

    switch (intent.operationType) {
      case OperationType.TASK:
        return this.handleTaskOperation(intent, notifier);

      case OperationType.DIR_ADD:
        return this.handlers.handleDirAdd(intent, notifier);

      case OperationType.DIR_LIST:
        return this.handlers.handleDirList(notifier);

      case OperationType.DIR_INFO:
        return this.handlers.handleDirInfo(intent, notifier);

      case OperationType.DIR_UPDATE:
        return this.handlers.handleDirUpdate(intent, notifier);

      case OperationType.DIR_DELETE:
        return this.handlers.handleDirDelete(intent, notifier);

      case OperationType.DIR_SET_DEFAULT:
        return this.handlers.handleDirSetDefault(intent, notifier);

      case OperationType.PREVIEW_START:
        return this.handlers.handlePreviewStart(intent, notifier, webhookUrl);

      case OperationType.PREVIEW_STOP:
        return this.handlers.handlePreviewStop(intent, notifier);

      case OperationType.PREVIEW_STOP_ALL:
        return this.handlers.handlePreviewStopAll(notifier);

      case OperationType.PREVIEW_STATUS:
        return this.handlers.handlePreviewStatus(intent, notifier);

      case OperationType.HISTORY_VIEW:
        return this.handlers.handleHistoryView(intent, notifier);

      case OperationType.HISTORY_CLEAR:
        return this.handlers.handleHistoryClear(intent, notifier);

      case OperationType.SYSTEM_INFO:
        return this.handlers.handleSystemInfo(notifier);

      case OperationType.SYSTEM_HEALTH:
        return this.handlers.handleSystemHealth(notifier);

      case OperationType.HELP:
        return this.handlers.handleHelp(notifier);

      default:
        await notifier.notifyError(`未知操作类型: ${intent.operationType}`);
        return { text: '未知操作类型' };
    }
  }

  /**
   * 处理任务执行
   */
  private async handleTaskOperation(
    intent: IntentRecognition,
    notifier: DingTalkNotifier
  ): Promise<{ text: string }> {
    const { taskPrompt, workingDir: dirInput, newSession } = intent;
    const resolved = this.resolveWorkingDir(dirInput);

    return this.runTask(
      {
        prompt: taskPrompt || '',
        workingDir: resolved.path,
        newSession: newSession || false,
        dirConfig: resolved.config,
      },
      notifier
    );
  }

  /**
   * 解析工作目录（支持别名或路径）
   */
  private resolveWorkingDir(dirInput?: string | null, dirAlias?: string | null): ResolvedWorkingDir {
    if (dirAlias) {
      const config = this.workingDirRepo.findByAlias(dirAlias);
      if (config) {
        return { path: config.path, config };
      }
      return { path: '' };
    }

    if (dirInput) {
      const configByAlias = this.workingDirRepo.findByAlias(dirInput);
      if (configByAlias) {
        return { path: configByAlias.path, config: configByAlias };
      }
      const configByPath = this.workingDirRepo.findAll().find((d) => d.path === dirInput);
      return { path: dirInput, config: configByPath };
    }

    const defaultConfig = this.workingDirRepo.findDefault();
    return {
      path: defaultConfig?.path || process.cwd(),
      config: defaultConfig,
    };
  }

  /**
   * 执行任务并发送通知
   */
  private async runTask(params: TaskParams, notifier: DingTalkNotifier): Promise<{ text: string }> {
    const { prompt, workingDir, newSession, dirConfig } = params;

    this.state.setCurrentTask(prompt);

    try {
      await notifier.notifyTaskReceived(workingDir, newSession);

      const result = await executeTask({ prompt, workingDir, newSession });

      if (!result.success) {
        throw new Error(result.output);
      }

      await notifier.notifyTaskComplete(prompt, result.output);

      if (dirConfig?.preview_enabled && dirConfig.start_cmd) {
        await this.autoStartPreview(dirConfig, notifier);
      }

      return { text: '任务完成' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('执行失败:', errorMsg);
      await notifier.notifyTaskFailed(errorMsg);
      return { text: '任务失败' };
    } finally {
      this.state.clearCurrentTask();
    }
  }

  /**
   * 任务完成后自动启动预览
   */
  private async autoStartPreview(dirConfig: WorkingDirectory, notifier: DingTalkNotifier): Promise<void> {
    logger.info('任务完成，自动启动预览...');

    try {
      const info = await this.previewService.start(dirConfig);
      await notifier.sendMarkdown(
        '✅ 预览已启动',
        `**别名**: ${info.alias}\n\n**端口**: ${info.port}\n\n**URL**: [${info.tunnelUrl}](${info.tunnelUrl})\n\n请点击上述链接预览您的项目`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('预览启动失败:', errorMsg);
      await notifier.sendText(`⚠️ 预览启动失败: ${errorMsg}`);
    }
  }
}
