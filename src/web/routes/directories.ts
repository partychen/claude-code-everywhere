import { Router, Request, Response, NextFunction } from 'express';
import { WebServerConfig } from '../server.js';
import { PathValidator } from '../../utils/path.js';
import { CreateDirectoryRequest, UpdateDirectoryRequest } from '../types/api.js';

export function createDirectoriesRouter(config: WebServerConfig): Router {
  const router = Router();
  const { workingDirRepo, allowedRootDir } = config;
  const pathValidator = new PathValidator(allowedRootDir);

  // 列出所有工作目录
  router.get('/', (req: Request, res: Response) => {
    const dirs = workingDirRepo.findAll();
    res.json({ success: true, data: dirs });
  });

  // 获取目录详情
  router.get('/:alias', (req: Request, res: Response) => {
    const dir = workingDirRepo.findByAlias(req.params.alias);
    if (!dir) {
      return res.status(404).json({ success: false, error: '未找到目录' });
    }
    res.json({ success: true, data: dir });
  });

  // 添加目录
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CreateDirectoryRequest;
      const { alias, path, description, previewEnabled, startCmd, previewPort, isDefault } =
        body;

      // 验证路径
      const validation = pathValidator.validate(path);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      // 检查别名冲突
      if (workingDirRepo.findByAlias(alias)) {
        return res.status(409).json({ success: false, error: '别名已存在' });
      }

      // 创建目录
      const dir = workingDirRepo.create({
        alias,
        path: validation.normalizedPath!,
        description,
        previewEnabled: previewEnabled || false,
        startCmd,
        previewPort,
        isDefault: isDefault || false,
      });

      res.json({ success: true, data: dir });
    } catch (error) {
      next(error);
    }
  });

  // 更新目录
  router.put('/:alias', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as UpdateDirectoryRequest;
      const { description, previewEnabled, startCmd, previewPort } = body;

      const updated = workingDirRepo.update(req.params.alias, {
        description,
        previewEnabled,
        startCmd,
        previewPort,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: '未找到目录' });
      }

      const dir = workingDirRepo.findByAlias(req.params.alias);
      res.json({ success: true, data: dir });
    } catch (error) {
      next(error);
    }
  });

  // 删除目录
  router.delete('/:alias', (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = workingDirRepo.delete(req.params.alias);
      if (!deleted) {
        return res.status(404).json({ success: false, error: '未找到目录' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // 设置默认目录
  router.put('/:alias/default', (req: Request, res: Response, next: NextFunction) => {
    try {
      const success = workingDirRepo.setDefault(req.params.alias);
      if (!success) {
        return res.status(404).json({ success: false, error: '未找到目录' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
