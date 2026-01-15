import { executeCommand } from '../utils/shell.js';
import { isSamePath } from '../utils/path.js';
import { logger } from '../utils/logger.js';

/**
 * 检查目录是否需要自动部署
 */
export function shouldAutoDeploy(workingDir: string, autoDeployDirs: string[]): boolean {
  if (autoDeployDirs.length === 0) {
    return false;
  }

  return autoDeployDirs.some(dir => isSamePath(workingDir, dir));
}

/**
 * 执行部署命令
 */
export async function runDeploy(workingDir: string): Promise<string> {
  logger.info('开始部署: npm run deploy');

  const result = await executeCommand({
    command: 'npm run deploy',
    cwd: workingDir,
    logOutput: true, // 实时输出部署日志
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || `部署失败，退出码: ${result.exitCode}`);
  }

  logger.info('部署完成');

  // 返回预览 URL 而不是部署输出
  const previewUrl = process.env.PREVIEW_VERCEL_URL;
  if (previewUrl) {
    return `预览链接: ${previewUrl}`;
  }

  return '部署成功';
}
