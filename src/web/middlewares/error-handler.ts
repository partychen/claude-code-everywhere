import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('API Error:', err.message);
  if (err.stack) {
    logger.error(err.stack);
  }

  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}
