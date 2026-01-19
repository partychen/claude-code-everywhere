import { Router, Request, Response } from 'express';
import { verifyPassword } from '../../utils/crypto.js';
import { generateToken, verifyToken } from '../../utils/jwt.js';

export interface AuthConfig {
  username: string;
  passwordHash: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export function createAuthRouter(config: AuthConfig): Router {
  const router = Router();

  // 登录接口
  router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '请提供用户名和密码',
      });
    }

    // 验证用户名和密码
    if (
      username !== config.username ||
      !verifyPassword(password, config.passwordHash)
    ) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误',
      });
    }

    // 生成 JWT
    const token = generateToken(username, config.jwtSecret, config.jwtExpiresIn);

    res.json({
      success: true,
      data: {
        token,
        username,
        expiresIn: config.jwtExpiresIn,
      },
    });
  });

  // 验证 token 接口（可选，用于前端验证 token 是否有效）
  router.post('/verify', (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: '请提供 token' });
    }

    const payload = verifyToken(token, config.jwtSecret);

    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    res.json({ success: true, data: { username: payload.username } });
  });

  return router;
}
