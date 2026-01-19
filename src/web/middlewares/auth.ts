import { Request, Response, NextFunction } from 'express';

export function authMiddleware(token: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
  };
}
