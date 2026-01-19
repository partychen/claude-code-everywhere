import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync, mkdirSync } from 'fs';

import { logger } from '../utils/logger.js';

export interface AgentOptions {
  prompt: string;
  workingDir: string;
  newSession: boolean;
}

export interface AgentResult {
  output: string;
  success: boolean;
}

export type ProgressCallback = (text: string, messageType: string) => Promise<void>;

/**
 * 从 SDK 消息中提取文本内容
 */
function extractText(message: unknown): string {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const msg = message as Record<string, unknown>;

  // Assistant 响应消息
  if (msg.type === 'assistant' && msg.message) {
    const betaMessage = msg.message as Record<string, unknown>;
    const content = betaMessage.content;
    if (Array.isArray(content)) {
      return content
        .filter((c): c is { type: string; text: string } => c?.type === 'text')
        .map((c) => c.text)
        .join('\n');
    }
  }

  // 工具执行结果
  if (msg.type === 'result' && msg.result) {
    logger.debug(`工具执行: ${msg.tool_name}`);
  }

  // 状态消息
  if (msg.type === 'status' && Array.isArray(msg.output)) {
    return msg.output.join('\n');
  }

  return '';
}

/**
 * 处理进度回调
 */
async function handleProgress(
  message: unknown,
  text: string,
  onProgress: ProgressCallback
): Promise<void> {
  const msg = message as Record<string, unknown>;

  if (text && msg.type === 'assistant') {
    await onProgress(text, 'assistant_response');
  }

  if (msg.type === 'result' && msg.subtype === 'success') {
    const durationSec = Math.round((msg.duration_ms as number) / 1000);
    await onProgress(
      `任务完成 (耗时: ${durationSec}s, 轮次: ${msg.num_turns})`,
      'result'
    );
  }

  if (msg.type === 'system' && msg.subtype === 'status' && text) {
    await onProgress(text, 'status');
  }
}

/**
 * 执行 Claude Agent 任务
 */
export async function executeTask(
  options: AgentOptions,
  onProgress?: ProgressCallback
): Promise<AgentResult> {
  const { prompt, workingDir, newSession } = options;

  logger.info(`开始执行 Claude Agent - 工作目录: ${workingDir}, 新会话: ${newSession}`);

  try {
    // 检查工作目录是否存在，不存在则创建
    if (!existsSync(workingDir)) {
      logger.info(`工作目录不存在，正在创建: ${workingDir}`);
      mkdirSync(workingDir, { recursive: true });
      logger.info(`工作目录创建成功: ${workingDir}`);
    }

    const queryStream = query({
      prompt,
      options: {
        cwd: workingDir,
        settingSources: ['project'],
        continue: !newSession,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        systemPrompt: "You are a helpful assistant. Follow these important guidelines:\n\n1. SECURITY: Never expose or leak sensitive information such as API keys, passwords, credentials, tokens, or any security-related data.\n\n2. CODE QUALITY: Ensure all code is correct and follows best practices.\n\n3. DEPENDENCIES: Install all necessary dependencies required for the service to run properly. Use appropriate package managers (npm, pip, etc.) to install required packages.\n\n4. NO SERVICE STARTUP: Do NOT attempt to start, run, or launch any services. Only prepare the environment and install dependencies, but do not execute startup commands."
      },
    });

    const messages: string[] = [];

    for await (const message of queryStream) {
      const text = extractText(message);
      if (text) {
        messages.push(text);
      }

      if (onProgress) {
        await handleProgress(message, text, onProgress);
      }
    }

    logger.info('执行完成');

    return {
      output: messages.join('\n') || '(无输出)',
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Agent 执行失败:', errorMsg);

    return {
      output: errorMsg,
      success: false,
    };
  }
}
