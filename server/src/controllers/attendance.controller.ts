import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import crypto from 'crypto';
import { env } from '../config/env';

// Generate a time-limited QR token (HMAC-SHA256)
export const startQrSession = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
    return;
  }

  const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds
  const payload = JSON.stringify({ sessionId: id, exp: expiresAt.getTime() });
  const qrToken = crypto
    .createHmac('sha256', env.jwtAccessSecret)
    .update(payload)
    .digest('hex');

  res.json({ success: true, data: { qrToken, payload: Buffer.from(payload).toString('base64'), expiresAt } });
};

// Student scans QR
export const scanQr = async (req: any, res: Response): Promise<void> => {
  try {
    const { payload } = req.body;
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));

    if (Date.now() > decoded.exp) {
      res.status(400).json({ success: false, error: { code: 'EXPIRED', message: 'QR code has expired. Ask teacher to refresh.' } });
      return;
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only students can scan QR codes' } });
      return;
    }

    const existing = await prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId: decoded.sessionId, studentId: student.id } },
    });

    if (existing) {
      res.json({ success: true, data: { markedStatus: existing.status, message: 'Already marked' } });
      return;
    }

    const attendance = await prisma.attendance.create({
      data: {
        sessionId: decoded.sessionId,
        studentId: student.id,
        status: 'PRESENT',
        markedVia: 'QR_SCAN',
      },
    });

    res.json({ success: true, data: { markedStatus: attendance.status, timestamp: attendance.markedAt } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// Bulk attendance by teacher
export const bulkMarkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, records } = req.body;
    // records: [{ studentId, status }]

    const upserts = records.map((r: { studentId: string; status: string }) =>
      prisma.attendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId: r.studentId } },
        create: { sessionId, studentId: r.studentId, status: r.status as any, markedVia: 'TEACHER_MANUAL' },
        update: { status: r.status as any },
      })
    );

    await prisma.$transaction(upserts);
    res.json({ success: true, message: `Marked ${records.length} students` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// Get session attendance
export const getSessionAttendance = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const records = await prisma.attendance.findMany({
    where: { sessionId: id },
    include: { student: { include: { user: { select: { name: true } } } } },
  });
  res.json({ success: true, data: records });
};

// Get student's own attendance
export const getStudentAttendance = async (req: any, res: Response): Promise<void> => {
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student profile not found' } });
    return;
  }

  const records = await prisma.attendance.findMany({
    where: { studentId: student.id },
    include: { session: { include: { course: true, timeSlot: true } } },
    orderBy: { session: { date: 'desc' } },
  });
  res.json({ success: true, data: records });
};

// Submit engagement (poll/quiz)
export const submitEngagement = async (req: Request, res: Response): Promise<void> => {
  const engagement = await prisma.engagement.create({ data: req.body });
  res.status(201).json({ success: true, data: engagement });
};

// Submit feedback
export const submitFeedback = async (req: any, res: Response): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only students can submit feedback' } });
      return;
    }
    const feedback = await prisma.feedback.create({
      data: { ...req.body, studentId: student.id },
    });
    res.status(201).json({ success: true, data: feedback });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// Compute productivity score for a session
export const computeProductivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, attendanceRate, engagementScore, learningScore, feedbackScore } = req.body;
    const wA = 0.4, wE = 0.3, wL = 0.2, wF = 0.1;
    const compositeScore = 100 * (wA * attendanceRate + wE * engagementScore + wL * learningScore + wF * feedbackScore);

    const score = await prisma.productivityScore.upsert({
      where: { sessionId },
      create: { sessionId, attendanceRate, engagementScore, learningScore, feedbackScore, compositeScore },
      update: { attendanceRate, engagementScore, learningScore, feedbackScore, compositeScore },
    });

    res.json({ success: true, data: score });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
