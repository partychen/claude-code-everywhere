import { PreviewInfo } from '../types/database.js';

/**
 * 钉钉通知服务
 */
export class DingTalkNotifier {
  constructor(private webhookUrl: string) {}

  async sendText(content: string): Promise<void> {
    if (!this.webhookUrl) return;

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'text', text: { content } }),
    });
  }

  async sendMarkdown(title: string, text: string): Promise<void> {
    if (!this.webhookUrl) return;

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { title, text: text.trim() } }),
    });
  }

  async notifyTaskReceived(workingDir: string, newSession: boolean): Promise<void> {
    const sessionInfo = newSession ? '\n(新会话)' : '';
    await this.sendText(`✅ 任务已接收，正在处理中...\n工作目录: ${workingDir}${sessionInfo}`);
  }

  async notifyError(message: string): Promise<void> {
    await this.sendText(`❌ ${message}`);
  }

  async notifyTaskComplete(prompt: string, output: string): Promise<void> {
    const message =
      `## ✅ 任务完成\n\n` +
      `**任务**: ${prompt}\n\n` +
      `**结果**:\n\`\`\`\n${output}\n\`\`\``;
    await this.sendMarkdown('Claude Code 结果', message);
  }

  async notifyTaskFailed(errorMsg: string): Promise<void> {
    await this.sendText(`❌ 任务失败: ${errorMsg}`);
  }

  async notifyTaskBusy(currentTask: string): Promise<void> {
    await this.sendText(`⏳ 当前有任务正在执行，请稍后再试...\n正在处理: ${currentTask.slice(0, 50)}`);
  }

  async notifyPreviewStarted(info: PreviewInfo): Promise<void> {
    const message =
      `## ✅ 预览已启动\n\n` +
      `**别名**: ${info.alias}\n` +
      `**端口**: ${info.port}\n` +
      `**预览链接**: [点击访问](${info.tunnelUrl})\n` +
      `**进程 PID**: ${info.pid}\n` +
      `**Tunnel PID**: ${info.tunnelPid}\n\n` +
      `💡 点击上方链接即可在浏览器中预览您的项目`;
    await this.sendMarkdown('预览服务', message);
  }

  async notifyPreviewStartFailed(alias: string, error: string): Promise<void> {
    await this.sendText(`❌ 预览启动失败 [${alias}]: ${error}`);
  }
}
