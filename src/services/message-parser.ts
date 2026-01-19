export interface ParsedMessage {
  workingDir: string | null;
  dirAlias: string | null;
  prompt: string;
  newSession: boolean;
}

/**
 * 解析消息中的选项，格式: [dir:/path|alias] [new] 任务内容
 */
export function parseMessage(content: string): ParsedMessage {
  let workingDir: string | null = null;
  let dirAlias: string | null = null;
  let newSession = false;
  let remaining = content;

  const dirMatch = remaining.match(/^\[dir:([^\]]+)\]\s*/);
  if (dirMatch) {
    const dirValue = dirMatch[1].trim();
    if (dirValue.startsWith('/') || dirValue.startsWith('~')) {
      workingDir = dirValue;
    } else {
      dirAlias = dirValue;
    }
    remaining = remaining.slice(dirMatch[0].length);
  }

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
