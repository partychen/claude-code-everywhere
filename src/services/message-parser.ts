export interface ParsedMessage {
  workingDir: string | null;  // null 表示使用默认目录
  dirAlias: string | null;    // 别名（如果使用）
  prompt: string;
  newSession: boolean;
}

/**
 * 解析消息中的选项，格式: [dir:/path|alias] [new] 任务内容
 * 每个目录有独立的会话上下文，切换目录自动切换上下文
 */
export function parseMessage(content: string): ParsedMessage {
  let workingDir: string | null = null;
  let dirAlias: string | null = null;
  let newSession = false;
  let remaining = content;

  // 解析 [dir:path|alias] - 切换到该目录的会话上下文
  const dirMatch = remaining.match(/^\[dir:([^\]]+)\]\s*/);
  if (dirMatch) {
    const dirValue = dirMatch[1].trim();
    // 判断是完整路径还是别名
    if (dirValue.startsWith('/') || dirValue.startsWith('~')) {
      workingDir = dirValue;
    } else {
      dirAlias = dirValue;
    }
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
    dirAlias,
    prompt: remaining.trim(),
    newSession,
  };
}
