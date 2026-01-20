import { IntentRecognition } from '../llm/intent-recognizer.js';

/**
 * 待确认的动作
 */
export interface PendingAction {
  userId: string;
  conversationId: string;
  intent: IntentRecognition;
  timestamp: number;
  timeoutMs: number;
}

/**
 * 创建待确认动作
 */
export function createPendingAction(
  userId: string,
  conversationId: string,
  intent: IntentRecognition,
  timeoutMs: number = 60000 // 默认 60 秒超时
): PendingAction {
  return {
    userId,
    conversationId,
    intent,
    timestamp: Date.now(),
    timeoutMs,
  };
}

/**
 * 检查待确认动作是否已过期
 */
export function isPendingActionExpired(action: PendingAction): boolean {
  return Date.now() - action.timestamp > action.timeoutMs;
}
