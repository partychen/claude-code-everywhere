import { Router, Request, Response, NextFunction } from 'express';
import { WebServerConfig } from '../server.js';

function getAlias(req: Request): string {
  const alias = req.params.alias;
  return Array.isArray(alias) ? alias[0] : alias;
}

export function createPreviewsRouter(config: WebServerConfig): Router {
  const router = Router();
  const { previewService, workingDirRepo } = config;

  router.get('/', (_req: Request, res: Response) => {
    res.json({ success: true, data: previewService.getStatus() });
  });

  router.get('/:alias', (req: Request, res: Response) => {
    const previews = previewService.getStatus(getAlias(req));
    if (previews.length === 0) {
      return res.status(404).json({ success: false, error: '未找到预览服务' });
    }
    res.json({ success: true, data: previews[0] });
  });

  router.post('/:alias/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = workingDirRepo.findByAlias(getAlias(req));
      if (!dir) {
        return res.status(404).json({ success: false, error: '未找到工作目录' });
      }
      if (!dir.preview_enabled) {
        return res.status(400).json({ success: false, error: '未启用预览功能' });
      }
      if (!dir.start_cmd) {
        return res.status(400).json({ success: false, error: '未配置启动命令' });
      }

      const result = await previewService.start(dir);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post('/stop-all', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await previewService.stopAll();
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:alias/stop', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await previewService.stop(getAlias(req));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
