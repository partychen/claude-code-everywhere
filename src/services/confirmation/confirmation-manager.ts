import { PendingAction, isPendingActionExpired } from './pending-action.js';
import { logger } from '../../utils/logger.js';

/**
 * 确认流程管理器
 * 管理待确认的动作，支持多用户多会话
 */
export class ConfirmationManager {
  // Key: `${conversationId}:${userId}`
  private pendingActions = new Map<string, PendingAction>();

  /**
   * 添加待确认的动作
   */
  setPending(action: PendingAction): void {
    const key = this.getKey(action.conversationId, action.userId);
    this.pendingActions.set(key, action);
    logger.info(`设置待确认动作: ${key}, 超时: ${action.timeoutMs}ms`);

    // 自动清理超时动作
    setTimeout(() => {
      this.cleanupExpired(key);
    }, action.timeoutMs);
  }

  /**
   * 获取待确认的动作
   */
  getPending(conversationId: string, userId: string): PendingAction | undefined {
    const key = this.getKey(conversationId, userId);
    const action = this.pendingActions.get(key);

    if (!action) {
      return undefined;
    }

    if (isPendingActionExpired(action)) {
      logger.info(`待确认动作已过期: ${key}`);
      this.pendingActions.delete(key);
      return undefined;
    }

    return action;
  }

  /**
   * 确认动作
   */
  confirm(conversationId: string, userId: string): PendingAction | undefined {
    const key = this.getKey(conversationId, userId);
    const action = this.getPending(conversationId, userId);

    if (action) {
      this.pendingActions.delete(key);
      logger.info(`确认动作: ${key}`);
    }

    return action;
  }

  /**
   * 取消动作
   */
  cancel(conversationId: string, userId: string): boolean {
    const key = this.getKey(conversationId, userId);
    const existed = this.pendingActions.has(key);

    if (existed) {
      this.pendingActions.delete(key);
      logger.info(`取消动作: ${key}`);
    }

    return existed;
  }

  /**
   * 检查是否有待确认的动作
   */
  hasPending(conversationId: string, userId: string): boolean {
    return this.getPending(conversationId, userId) !== undefined;
  }

  private getKey(conversationId: string, userId: string): string {
    return `${conversationId}:${userId}`;
  }

  private cleanupExpired(key: string): void {
    const action = this.pendingActions.get(key);
    if (action && isPendingActionExpired(action)) {
      this.pendingActions.delete(key);
      logger.info(`清理过期的待确认动作: ${key}`);
    }
  }
}
