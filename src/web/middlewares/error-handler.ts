import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('API Error:', err.message);
  logger.error(err.stack);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}
