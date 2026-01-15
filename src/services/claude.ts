import { executeCommand } from '../utils/shell.js';
import { logger } from '../utils/logger.js';

export interface ClaudeOptions {
  prompt: string;
  workingDir: string;
  newSession: boolean;
}

/**
 * 执行 Claude Code CLI
 */
export async function runClaudeCode(options: ClaudeOptions): Promise<string> {
  const { prompt, workingDir, newSession } = options;

  logger.info('开始执行 Claude Code...');
  logger.info(`工作目录: ${workingDir}, 新会话: ${newSession}`);

  const continueFlag = newSession ? '' : '--continue';
  const command = `claude --print ${continueFlag} --dangerously-skip-permissions`;

  const result = await executeCommand({
    command,
    cwd: workingDir,
    input: prompt,
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || `Exit code: ${result.exitCode}`);
  }

  logger.info('执行完成');
  return result.stdout || '(无输出)';
}
