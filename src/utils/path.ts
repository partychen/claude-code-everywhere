import { resolve, normalize, isAbsolute, sep } from 'path';
import { homedir } from 'os';

export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
}

function expandPath(path: string): string {
  if (path.startsWith('~')) {
    path = path.replace('~', homedir());
  }
  return normalize(resolve(path));
}

/**
 * 路径安全验证工具
 */
export class PathValidator {
  private allowedRootDir: string;

  constructor(allowedRootDir: string) {
    this.allowedRootDir = expandPath(allowedRootDir);
  }

  validate(userInputPath: string): PathValidationResult {
    if (!userInputPath || !userInputPath.trim()) {
      return { valid: false, error: '路径不能为空' };
    }

    if (isAbsolute(userInputPath) || userInputPath.startsWith('~')) {
      return {
        valid: false,
        error: '请只提供相对路径（如 "blog" 或 "projects/web"），不要使用绝对路径',
      };
    }

    if (this.containsDangerousPattern(userInputPath)) {
      return {
        valid: false,
        error: '路径包含不安全的字符或模式（不允许 .., 特殊字符等）',
      };
    }

    const finalPath = normalize(resolve(this.allowedRootDir, userInputPath));

    if (!this.isPathUnderRoot(finalPath)) {
      return { valid: false, error: '路径遍历攻击被阻止' };
    }

    return { valid: true, normalizedPath: finalPath };
  }

  private isPathUnderRoot(path: string): boolean {
    const normalizedRoot = this.allowedRootDir.endsWith(sep)
      ? this.allowedRootDir
      : this.allowedRootDir + sep;
    const normalizedPath = path.endsWith(sep) ? path : path + sep;
    return normalizedPath.startsWith(normalizedRoot);
  }

  private containsDangerousPattern(path: string): boolean {
    const dangerousPatterns = [
      /\.\./,       // 路径遍历
      /[<>"|?*]/,   // Windows 不允许的字符
      /\x00/,       // null 字节
    ];
    return dangerousPatterns.some((pattern) => pattern.test(path));
  }

  getAllowedRootDir(): string {
    return this.allowedRootDir;
  }
}
