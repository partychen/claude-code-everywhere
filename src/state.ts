import { ConfirmationManager } from './services/confirmation/confirmation-manager.js';

/**
 * 应用状态管理
 */
export class AppState {
  private processedMessages = new Set<string>();
  private currentTask: string | null = null;
  private readonly maxMessagesCache = 1000;

  // 确认管理器
  public readonly confirmationManager = new ConfirmationManager();

  isMessageProcessed(messageId: string): boolean {
    return this.processedMessages.has(messageId);
  }

  markMessageProcessed(messageId: string): void {
    this.processedMessages.add(messageId);

    if (this.processedMessages.size > this.maxMessagesCache) {
      const first = this.processedMessages.values().next().value;
      if (first) {
        this.processedMessages.delete(first);
      }
    }
  }

  hasCurrentTask(): boolean {
    return this.currentTask !== null;
  }

  getCurrentTask(): string | null {
    return this.currentTask;
  }

  setCurrentTask(task: string): void {
    this.currentTask = task;
  }

  clearCurrentTask(): void {
    this.currentTask = null;
  }
}
