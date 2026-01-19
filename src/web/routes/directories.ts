import { Router, Request, Response, NextFunction } from 'express';
import { WebServerConfig } from '../server.js';
import { PathValidator } from '../../utils/path.js';
import { CreateDirectoryRequest, UpdateDirectoryRequest } from '../types/api.js';

function getAlias(req: Request): string {
  const alias = req.params.alias;
  return Array.isArray(alias) ? alias[0] : alias;
}

export function createDirectoriesRouter(config: WebServerConfig): Router {
  const router = Router();
  const { workingDirRepo, allowedRootDir } = config;
  const pathValidator = new PathValidator(allowedRootDir);

  router.get('/', (_req: Request, res: Response) => {
    res.json({ success: true, data: workingDirRepo.findAll() });
  });

  router.get('/:alias', (req: Request, res: Response) => {
    const dir = workingDirRepo.findByAlias(getAlias(req));
    if (!dir) {
      return res.status(404).json({ success: false, error: '未找到目录' });
    }
    res.json({ success: true, data: dir });
  });

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as CreateDirectoryRequest;

      const validation = pathValidator.validate(body.path);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      if (workingDirRepo.findByAlias(body.alias)) {
        return res.status(409).json({ success: false, error: '别名已存在' });
      }

      const dir = workingDirRepo.create({
        alias: body.alias,
        path: validation.normalizedPath!,
        description: body.description,
        previewEnabled: body.previewEnabled || false,
        startCmd: body.startCmd,
        previewPort: body.previewPort,
        isDefault: body.isDefault || false,
      });

      res.json({ success: true, data: dir });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:alias', (req: Request, res: Response, next: NextFunction) => {
    try {
      const alias = getAlias(req);
      const body = req.body as UpdateDirectoryRequest;

      const updated = workingDirRepo.update(alias, {
        description: body.description,
        previewEnabled: body.previewEnabled,
        startCmd: body.startCmd,
        previewPort: body.previewPort,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: '未找到目录' });
      }

      res.json({ success: true, data: workingDirRepo.findByAlias(alias) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:alias', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!workingDirRepo.delete(getAlias(req))) {
        return res.status(404).json({ success: false, error: '未找到目录' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:alias/default', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!workingDirRepo.setDefault(getAlias(req))) {
        return res.status(404).json({ success: false, error: '未找到目录' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
