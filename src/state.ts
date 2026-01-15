/**
 * 应用状态管理
 */
export class AppState {
  private processedMessages = new Set<string>();
  private currentTask: string | null = null;
  private readonly maxMessagesCache = 1000;

  /**
   * 检查消息是否已处理
   */
  isMessageProcessed(messageId: string): boolean {
    return this.processedMessages.has(messageId);
  }

  /**
   * 标记消息已处理
   */
  markMessageProcessed(messageId: string): void {
    this.processedMessages.add(messageId);

    // 清理旧消息 ID（保留最近 N 条）
    if (this.processedMessages.size > this.maxMessagesCache) {
      const first = this.processedMessages.values().next().value;
      this.processedMessages.delete(first);
    }
  }

  /**
   * 检查是否有任务正在执行
   */
  hasCurrentTask(): boolean {
    return this.currentTask !== null;
  }

  /**
   * 获取当前任务
   */
  getCurrentTask(): string | null {
    return this.currentTask;
  }

  /**
   * 设置当前任务
   */
  setCurrentTask(task: string): void {
    this.currentTask = task;
  }

  /**
   * 清除当前任务
   */
  clearCurrentTask(): void {
    this.currentTask = null;
  }
}
