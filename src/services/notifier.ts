/**
 * 钉钉通知服务
 */
export class DingTalkNotifier {
  constructor(private webhookUrl: string) {}

  /**
   * 发送文本消息
   */
  async sendText(content: string): Promise<void> {
    if (!this.webhookUrl) return;

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content },
      }),
    });
  }

  /**
   * 发送 Markdown 消息
   */
  async sendMarkdown(title: string, text: string): Promise<void> {
    if (!this.webhookUrl) return;

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { title, text },
      }),
    });
  }

  /**
   * 通知任务已接收
   */
  async notifyTaskReceived(workingDir: string, newSession: boolean): Promise<void> {
    const dirInfo = `\n工作目录: ${workingDir}`;
    const sessionInfo = newSession ? '\n(新会话)' : '';
    await this.sendText(`✅ 任务已接收，正在处理中...${dirInfo}${sessionInfo}`);
  }

  /**
   * 通知错误
   */
  async notifyError(message: string): Promise<void> {
    await this.sendText(`❌ ${message}`);
  }

  /**
   * 通知任务完成
   */
  async notifyTaskComplete(prompt: string, output: string): Promise<void> {
    const message = `## ✅ 任务完成\n\n**任务**: ${prompt.slice(0, 100)}\n\n**结果**:\n\`\`\`\n${output.slice(0, 5000)}\n\`\`\``;
    await this.sendMarkdown('Claude Code 结果', message);
  }

  /**
   * 通知任务失败
   */
  async notifyTaskFailed(errorMsg: string): Promise<void> {
    await this.sendText(`❌ 任务失败: ${errorMsg}`);
  }

  /**
   * 通知任务繁忙
   */
  async notifyTaskBusy(currentTask: string): Promise<void> {
    await this.sendText(`⏳ 当前有任务正在执行，请稍后再试...\n正在处理: ${currentTask.slice(0, 50)}`);
  }

  /**
   * 通知开始部署
   */
  async notifyDeployStart(): Promise<void> {
    await this.sendText('🚀 开始自动部署...');
  }

  /**
   * 通知部署成功
   */
  async notifyDeploySuccess(output: string): Promise<void> {
    const message = `## 🎉 部署成功\n\n**部署输出**:\n\`\`\`\n${output.slice(-3000)}\n\`\`\``;
    await this.sendMarkdown('部署结果', message);
  }

  /**
   * 通知部署失败
   */
  async notifyDeployFailed(errorMsg: string): Promise<void> {
    await this.sendText(`❌ 部署失败: ${errorMsg}`);
  }
}
