import { createHash } from 'crypto';

/**
 * 计算 SHA-256 哈希
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * 验证密码
 */
export function verifyPassword(input: string, hash: string): boolean {
  return sha256(input) === hash;
}
