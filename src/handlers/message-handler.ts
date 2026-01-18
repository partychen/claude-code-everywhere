import { DWClientDownStream } from 'dingtalk-stream';

import { CommandHandler } from './command-handler.js';
import { WorkingDirectoryRepository } from '../repositories/working-directory.js';
import { executeTask } from '../services/agent.js';
import { parseMessage } from '../services/message-parser.js';
import { DingTalkNotifier } from '../services/notifier.js';
import { PreviewService } from '../services/preview.js';
import { AppState } from '../state.js';
import { WorkingDirectory } from '../types/database.js';
import { logger } from '../utils/logger.js';

export class MessageHandler {
  private commandHandler: CommandHandler;

  constructor(
    private state: AppState,
    private workingDirRepo: WorkingDirectoryRepository,
    private previewService: PreviewService,
    allowedRootDir: string
  ) {
    this.commandHandler = new CommandHandler(workingDirRepo, previewService, allowedRootDir);
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

    // 检查是否为命令
    if (this.commandHandler.isCommand(content)) {
      logger.info('识别为命令，进入命令处理流程');
      const result = await this.commandHandler.handle(content);

      if (result.success) {
        await notifier.sendMarkdown('命令执行结果', result.message);
      } else {
        await notifier.sendText(result.message);
      }

      return { text: result.success ? '命令执行成功' : '命令执行失败' };
    }

    // 检查是否有任务在执行
    if (this.state.hasCurrentTask()) {
      const currentTask = this.state.getCurrentTask()!;
      logger.info('任务繁忙，拒绝新任务');
      await notifier.notifyTaskBusy(currentTask);
      return { text: '任务繁忙' };
    }

    // 解析消息
    const parsed = parseMessage(content);
    const { prompt, newSession, dirAlias } = parsed;
    let { workingDir } = parsed;

    // 解析工作目录配置
    let dirConfig: WorkingDirectory | undefined;

    if (dirAlias) {
      // 使用别名查找
      dirConfig = this.workingDirRepo.findByAlias(dirAlias);
      if (!dirConfig) {
        logger.warn(`未找到别名: ${dirAlias}`);
        await notifier.notifyError(`未找到工作目录别名: ${dirAlias}`);
        return { text: `未找到别名: ${dirAlias}` };
      }
      workingDir = dirConfig.path;
    } else if (!workingDir) {
      // 使用默认目录
      dirConfig = this.workingDirRepo.findDefault();
      workingDir = dirConfig?.path || process.cwd();
    } else {
      // 通过路径查找配置
      dirConfig = this.workingDirRepo.findAll().find(d => d.path === workingDir);
    }

    this.state.setCurrentTask(prompt);

    try {
      // 通知任务已接收
      await notifier.notifyTaskReceived(workingDir, newSession);

      // 执行 Claude Agent
      const result = await executeTask({ prompt, workingDir, newSession });

      if (!result.success) {
        throw new Error(result.output);
      }

      // 通知任务完成
      await notifier.notifyTaskComplete(prompt, result.output);

      // 检查是否需要启动预览
      if (dirConfig && dirConfig.preview_enabled) {
        await this.handlePreview(dirConfig, notifier);
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
   * 处理预览启动
   */
  private async handlePreview(dirConfig: WorkingDirectory, notifier: DingTalkNotifier): Promise<void> {
    if (!dirConfig.start_cmd) {
      logger.warn(`工作目录 "${dirConfig.alias}" 未配置启动命令，跳过预览`);
      return;
    }

    logger.info('检测到预览配置，开始启动预览...');

    try {
      const info = await this.previewService.start(dirConfig);
      await notifier.sendMarkdown(
        '✅ 预览已启动',
        `**别名**: ${info.alias}\n**端口**: ${info.port}\n**URL**: ${info.tunnelUrl}\n\n请访问上述 URL 预览您的项目`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('预览启动失败:', errorMsg);
      await notifier.sendText(`⚠️ 预览启动失败: ${errorMsg}`);
    }
  }
}
