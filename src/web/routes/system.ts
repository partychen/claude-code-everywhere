import { Router, Request, Response } from 'express';
import { WebServerConfig } from '../server.js';

export function createSystemRouter(config: WebServerConfig): Router {
  const router = Router();

  router.get('/info', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: { allowedRootDir: config.allowedRootDir, version: '1.0.0' },
    });
  });

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, status: 'ok' });
  });

  return router;
}
