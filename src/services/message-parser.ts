export interface ParsedMessage {
  workingDir: string;
  prompt: string;
  newSession: boolean;
}

/**
 * 解析消息中的选项，格式: [dir:/path] [new] 任务内容
 * 每个目录有独立的会话上下文，切换目录自动切换上下文
 */
export function parseMessage(content: string, defaultWorkingDir: string): ParsedMessage {
  let workingDir = defaultWorkingDir;
  let newSession = false;
  let remaining = content;

  // 解析 [dir:path] - 切换到该目录的会话上下文
  const dirMatch = remaining.match(/^\[dir:([^\]]+)\]\s*/);
  if (dirMatch) {
    workingDir = dirMatch[1].trim();
    remaining = remaining.slice(dirMatch[0].length);
  }

  // 解析 [new] - 在当前目录强制开启新会话
  const newMatch = remaining.match(/^\[new\]\s*/i);
  if (newMatch) {
    newSession = true;
    remaining = remaining.slice(newMatch[0].length);
  }

  return {
    workingDir,
    prompt: remaining.trim(),
    newSession,
  };
}
