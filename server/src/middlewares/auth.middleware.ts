import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Access token required' } });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid or expired access token' } });
  }
};
