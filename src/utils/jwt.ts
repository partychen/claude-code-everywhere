import jwt, { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
  username: string;
  iat?: number;
  exp?: number;
}

export function generateToken(username: string, secret: string, expiresIn: string): string {
  const payload: JWTPayload = { username };
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    return null;
  }
}
