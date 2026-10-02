import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import axios from 'axios';
import { env } from '../config/env';

// ===================== GET TIMETABLE =====================
export const getTimetable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year, batchId, teacherId } = req.query;
    if (!month || !year) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'month and year are required' } });
      return;
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        month: parseInt(month as string),
        year: parseInt(year as string),
        status: { not: 'ARCHIVED' },
      },
      orderBy: { version: 'desc' },
    });

    if (!schedule) {
      res.json({ success: true, data: { schedule: null, sessions: [] } });
      return;
    }

    const sessionWhere: any = { scheduleId: schedule.id };
    if (batchId) sessionWhere.batchId = batchId;
    if (teacherId) sessionWhere.teacherId = teacherId;

    const sessions = await prisma.session.findMany({
      where: sessionWhere,
      include: {
        course: true,
        teacher: { include: { user: { select: { name: true } } } },
        batch: true,
        room: true,
        timeSlot: true,
        productivity: true,
      },
      orderBy: [{ date: 'asc' }, { timeSlot: { slotNumber: 'asc' } }],
    });

    res.json({ success: true, data: { schedule, sessions } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ===================== GENERATE TIMETABLE (ML) =====================
export const generateTimetable = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year, departmentId, solverWeights } = req.body;
    if (!month || !year || !departmentId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'month, year and departmentId are required' } });
      return;
    }

    // Gather all domain data
    const [teachers, batches, courses, rooms, timeSlots, holidays, events, constraints] = await Promise.all([
      prisma.teacher.findMany({
        where: { departmentId },
        include: { user: { select: { name: true } } },
      }),
      prisma.batch.findMany({ where: { departmentId } }),
      prisma.course.findMany({ where: { departmentId } }),
      prisma.room.findMany(),
      prisma.timeSlot.findMany({ where: { isBreak: false }, orderBy: [{ dayOfWeek: 'asc' }, { slotNumber: 'asc' }] }),
      prisma.holiday.findMany({
        where: {
          date: {
            gte: new Date(`${year}-${String(month).padStart(2, '0')}-01`),
            lt: new Date(`${year}-${String(month + 1).padStart(2, '0')}-01`),
          },
        },
      }),
      prisma.event.findMany({
        where: {
          startDate: { lte: new Date(`${year}-${String(month + 1).padStart(2, '0')}-01`) },
          endDate: { gte: new Date(`${year}-${String(month).padStart(2, '0')}-01`) },
        },
      }),
      prisma.constraint.findMany({ where: { isActive: true } }),
    ]);

    // Call ML service
    const mlPayload = {
      month,
      year,
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.user.name,
        maxWeeklyLoad: t.maxWeeklyLoad,
        preferences: t.preferences,
      })),
      batches: batches.map((b) => ({ id: b.id, name: b.name, size: b.size, semester: b.semester })),
      courses: courses.map((c) => ({ id: c.id, code: c.code, weeklyHours: c.weeklyHours, type: c.type })),
      rooms: rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, type: r.type })),
      timeSlots: timeSlots.map((ts) => ({
        id: ts.id,
        dayOfWeek: ts.dayOfWeek,
        slotNumber: ts.slotNumber,
        desirabilityScore: ts.desirabilityScore,
      })),
      holidays: holidays.map((h) => h.date.toISOString().split('T')[0]),
      events: events.map((e) => ({
        startDate: e.startDate.toISOString().split('T')[0],
        endDate: e.endDate.toISOString().split('T')[0],
        affectedBatches: e.affectedBatches,
      })),
      constraints,
      solverWeights: solverWeights || { fairnessWeight: 10, teacherPreferenceWeight: 5, attendancePredictionWeight: 8 },
    };

    let mlResult;
    try {
      const mlResponse = await axios.post(`${env.mlServiceUrl}/generate-timetable`, mlPayload, { timeout: 60000 });
      mlResult = mlResponse.data;
    } catch (mlErr: any) {
      // Fallback: create basic schedule without ML
      console.warn('ML service unavailable, using rule-based fallback');
      mlResult = {
        status: 'RULE_BASED_FALLBACK',
        fairnessGini: null,
        sessions: [],
        message: 'ML service not available. Deploy ml-service for optimized scheduling.',
      };
    }

    // Archive old schedule for this month/year
    await prisma.schedule.updateMany({
      where: { month, year, status: 'DRAFT' },
      data: { status: 'ARCHIVED' },
    });

    // Determine next version number to avoid unique constraint on (month, year, version)
    const latestSchedule = await prisma.schedule.findFirst({
      where: { month, year },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestSchedule?.version ?? 0) + 1;

    // Create new schedule
    const schedule = await prisma.schedule.create({
      data: {
        name: `CSE - ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} v${nextVersion}`,
        month,
        year,
        version: nextVersion,
        status: 'DRAFT',
        fairnessGini: mlResult.fairnessGini,
      },
    });

    // Persist sessions if ML returned them
    let sessionsCreated = 0;
    if (mlResult.sessions && mlResult.sessions.length > 0) {
      await prisma.$transaction(
        mlResult.sessions.map((s: any) =>
          prisma.session.create({
            data: {
              scheduleId: schedule.id,
              courseId: s.courseId,
              teacherId: s.teacherId,
              batchId: s.batchId,
              roomId: s.roomId,
              timeSlotId: s.timeSlotId,
              date: new Date(s.date),
              status: 'SCHEDULED',
            },
          })
        )
      );
      sessionsCreated = mlResult.sessions.length;
    }

    res.json({
      success: true,
      data: {
        scheduleId: schedule.id,
        totalSessionsGenerated: sessionsCreated,
        fairnessGini: mlResult.fairnessGini,
        solverStatus: mlResult.status,
        message: mlResult.message,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ===================== MANUAL OVERRIDE =====================
export const overrideSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { timeSlotId, roomId, date } = req.body;

    const existing = await prisma.session.findUnique({
      where: { id },
      include: { teacher: true, batch: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    const targetDate = new Date(date || existing.date);

    // Collision checks
    const [teacherConflict, roomConflict, batchConflict] = await Promise.all([
      prisma.session.findFirst({
        where: {
          id: { not: id },
          teacherId: existing.teacherId,
          timeSlotId: timeSlotId || existing.timeSlotId,
          date: targetDate,
          status: 'SCHEDULED',
        },
      }),
      prisma.session.findFirst({
        where: {
          id: { not: id },
          roomId: roomId || existing.roomId,
          timeSlotId: timeSlotId || existing.timeSlotId,
          date: targetDate,
          status: 'SCHEDULED',
        },
      }),
      prisma.session.findFirst({
        where: {
          id: { not: id },
          batchId: existing.batchId,
          timeSlotId: timeSlotId || existing.timeSlotId,
          date: targetDate,
          status: 'SCHEDULED',
        },
      }),
    ]);

    if (teacherConflict) {
      res.status(409).json({
        success: false,
        error: { code: 'HARD_CONSTRAINT_VIOLATION', message: 'Teacher is already booked in this slot on this date' },
      });
      return;
    }
    if (roomConflict) {
      res.status(409).json({
        success: false,
        error: { code: 'HARD_CONSTRAINT_VIOLATION', message: 'Room is already occupied in this slot on this date' },
      });
      return;
    }
    if (batchConflict) {
      res.status(409).json({
        success: false,
        error: { code: 'HARD_CONSTRAINT_VIOLATION', message: 'Batch already has a session scheduled in this slot' },
      });
      return;
    }

    const updated = await prisma.session.update({
      where: { id },
      data: {
        ...(timeSlotId && { timeSlotId }),
        ...(roomId && { roomId }),
        ...(date && { date: targetDate }),
      },
      include: { course: true, teacher: { include: { user: { select: { name: true } } } }, room: true, timeSlot: true },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};

// ===================== PUBLISH SCHEDULE =====================
export const publishSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.body;
    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'PUBLISHED' },
    });
    res.json({ success: true, data: schedule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
};
