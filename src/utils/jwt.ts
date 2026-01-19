import jwt from 'jsonwebtoken';

export interface JWTPayload {
  username: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}

/**
 * 生成 JWT Token
 */
export function generateToken(
  username: string,
  secret: string,
  expiresIn: string
): string {
  const payload: JWTPayload = { username };
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    return null;
  }
}
