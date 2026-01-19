import { Router, Request, Response } from 'express';
import { WebServerConfig } from '../server.js';

export function createSystemRouter(config: WebServerConfig): Router {
  const router = Router();

  // 获取系统信息
  router.get('/info', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        allowedRootDir: config.allowedRootDir,
        version: '1.0.0',
      },
    });
  });

  // 健康检查
  router.get('/health', (req: Request, res: Response) => {
    res.json({ success: true, status: 'ok' });
  });

  return router;
}
