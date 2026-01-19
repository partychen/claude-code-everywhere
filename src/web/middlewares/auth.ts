import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt.js';

/**
 * JWT 认证中间件
 */
export function jwtAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer '
    const payload = verifyToken(token, jwtSecret);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    // 将用户信息附加到请求对象
    (req as any).user = payload;
    next();
  };
}
