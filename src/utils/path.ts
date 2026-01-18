import { resolve, normalize, isAbsolute, sep } from 'path';
import { homedir } from 'os';

/**
 * 路径验证结果
 */
export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
}

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

/**
 * 扩展路径（处理 ~ 和相对路径）
 */
export function expandPath(path: string): string {
  // 处理 ~ 开头的路径
  if (path.startsWith('~')) {
    path = path.replace('~', homedir());
  }

  // 转换为绝对路径并标准化
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

  /**
   * 处理用户输入的路径
   * 用户只能提供相对路径，系统自动拼接到根目录下
   */
  validate(userInputPath: string): PathValidationResult {
    // 检查路径是否为空
    if (!userInputPath || !userInputPath.trim()) {
      return {
        valid: false,
        error: '路径不能为空',
      };
    }

    // 检查用户是否提供了绝对路径（不允许）
    // 支持 Unix (/path, ~/path) 和 Windows (C:\path, \\network\path)
    if (isAbsolute(userInputPath) || userInputPath.startsWith('~')) {
      return {
        valid: false,
        error: `请只提供相对路径（如 "blog" 或 "projects/web"），不要使用绝对路径`,
      };
    }

    // 检查是否包含危险字符
    if (this.containsDangerousPattern(userInputPath)) {
      return {
        valid: false,
        error: '路径包含不安全的字符或模式（不允许 .., 特殊字符等）',
      };
    }

    // 拼接到根目录
    const finalPath = normalize(resolve(this.allowedRootDir, userInputPath));

    // 安全检查：确保最终路径仍然在根目录下（防止 .. 攻击）
    if (!this.isPathUnderRoot(finalPath, this.allowedRootDir)) {
      return {
        valid: false,
        error: '路径遍历攻击被阻止',
      };
    }

    return {
      valid: true,
      normalizedPath: finalPath,
    };
  }

  /**
   * 检查路径是否在根目录下
   */
  private isPathUnderRoot(path: string, rootDir: string): boolean {
    // 确保两个路径都以路径分隔符结尾进行比较（跨平台兼容）
    const normalizedRoot = rootDir.endsWith(sep) ? rootDir : rootDir + sep;
    const normalizedPath = path.endsWith(sep) ? path : path + sep;

    return normalizedPath.startsWith(normalizedRoot);
  }

  /**
   * 检查是否包含危险的路径模式
   */
  private containsDangerousPattern(path: string): boolean {
    const dangerousPatterns = [
      /\.\./,           // 路径遍历 ../
      /[<>"|?*]/,       // Windows 不允许的字符
      /\x00/,           // null 字节
    ];

    return dangerousPatterns.some((pattern) => pattern.test(path));
  }

  /**
   * 获取允许的根目录（用于显示）
   */
  getAllowedRootDir(): string {
    return this.allowedRootDir;
  }
}
