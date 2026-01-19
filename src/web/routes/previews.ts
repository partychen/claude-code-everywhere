import { Router, Request, Response, NextFunction } from 'express';
import { WebServerConfig } from '../server.js';

export function createPreviewsRouter(config: WebServerConfig): Router {
  const router = Router();
  const { previewService, workingDirRepo } = config;

  // 获取所有预览服务状态
  router.get('/', (req: Request, res: Response) => {
    const previews = previewService.getStatus();
    res.json({ success: true, data: previews });
  });

  // 获取指定预览状态
  router.get('/:alias', (req: Request, res: Response) => {
    const previews = previewService.getStatus(req.params.alias);
    if (previews.length === 0) {
      return res.status(404).json({ success: false, error: '未找到预览服务' });
    }
    res.json({ success: true, data: previews[0] });
  });

  // 启动预览服务
  router.post('/:alias/start', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dir = workingDirRepo.findByAlias(req.params.alias);
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

  // 停止所有预览（必须在 /:alias/stop 之前定义）
  router.post('/stop-all', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await previewService.stopAll();
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // 停止预览服务
  router.post('/:alias/stop', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await previewService.stop(req.params.alias);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
