import { DWClientDownStream } from 'dingtalk-stream';
import { Config } from '../config.js';
import { AppState } from '../state.js';
import { parseMessage } from '../services/message-parser.js';
import { runClaudeCode } from '../services/claude.js';
import { shouldAutoDeploy, runDeploy } from '../services/deploy.js';
import { DingTalkNotifier } from '../services/notifier.js';
import { logger } from '../utils/logger.js';

export class MessageHandler {
  constructor(
    private config: Config,
    private state: AppState
  ) {}

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

    // 检查是否有任务在执行
    if (this.state.hasCurrentTask()) {
      const currentTask = this.state.getCurrentTask()!;
      logger.info('任务繁忙，拒绝新任务');
      await notifier.notifyTaskBusy(currentTask);
      return { text: '任务繁忙' };
    }

    // 解析消息
    const { workingDir, prompt, newSession } = parseMessage(
      content,
      this.config.claude.defaultWorkingDir
    );

    this.state.setCurrentTask(prompt);

    try {
      // 通知任务已接收
      await notifier.notifyTaskReceived(
        workingDir,
        this.config.claude.defaultWorkingDir,
        newSession
      );

      // 执行 Claude Code
      const output = await runClaudeCode({ prompt, workingDir, newSession });

      // 通知任务完成
      await notifier.notifyTaskComplete(prompt, output);

      // 检查是否需要自动部署
      if (shouldAutoDeploy(workingDir, this.config.deploy.autoDeployDirs)) {
        await this.handleDeploy(workingDir, notifier);
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
   * 处理自动部署
   */
  private async handleDeploy(workingDir: string, notifier: DingTalkNotifier): Promise<void> {
    logger.info('检测到自动部署配置，开始部署...');
    await notifier.notifyDeployStart();

    try {
      const deployOutput = await runDeploy(workingDir);
      await notifier.notifyDeploySuccess(deployOutput);
    } catch (deployError) {
      const errorMsg = deployError instanceof Error ? deployError.message : String(deployError);
      logger.error('部署失败:', errorMsg);
      await notifier.notifyDeployFailed(errorMsg);
    }
  }
}
