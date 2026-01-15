/**
 * 规范化路径用于比较（Windows 不区分大小写）
 */
export function normalizePath(path: string): string {
  return path.toLowerCase().replace(/\\/g, '/');
}

/**
 * 检查两个路径是否相同
 */
export function isSamePath(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2);
}
