import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional().default('STUDENT'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(payload: { id: string; email: string; role: string }) {
  const accessToken = jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiry as any });
  const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiry as any });
  return { accessToken, refreshToken };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered' } });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, name: data.name, role: data.role as any },
    });

    const { accessToken, refreshToken } = generateTokens({ id: user.id, email: user.email, role: user.role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.errors } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      return;
    }

    const { accessToken, refreshToken } = generateTokens({ id: user.id, email: user.email, role: user.role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.errors } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Refresh token required' } });
    return;
  }

  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid or expired refresh token' } });
      return;
    }

    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as { id: string; email: string; role: string };
    const accessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      env.jwtAccessSecret,
      { expiresIn: env.jwtAccessExpiry as any }
    );

    res.json({ success: true, data: { accessToken } });
  } catch {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid refresh token' } });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
  });
  res.json({ success: true, data: { user } });
};
