import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ===================== FAIRNESS INDEX =====================
export const getFairness = async (req: Request, res: Response): Promise<void> => {
  const { month, year } = req.query;

  const schedule = await prisma.schedule.findFirst({
    where: { month: Number(month), year: Number(year) },
    orderBy: { version: 'desc' },
  });

  if (!schedule) {
    res.json({ success: true, data: { overallGini: null, teacherDistribution: [] } });
    return;
  }

  const teachers = await prisma.teacher.findMany({ include: { user: { select: { name: true } } } });
  const undesirableSlots = await prisma.timeSlot.findMany({ where: { desirabilityScore: { lte: 2.0 } } });
  const undesirableIds = new Set(undesirableSlots.map((s) => s.id));

  const distribution = await Promise.all(
    teachers.map(async (t) => {
      const sessions = await prisma.session.findMany({
        where: { teacherId: t.id, scheduleId: schedule.id },
        include: { timeSlot: true },
      });
      const totalHours = sessions.length;
      const undesirableCount = sessions.filter((s) => undesirableIds.has(s.timeSlotId)).length;
      const desirabilityAvg =
        sessions.length > 0
          ? sessions.reduce((acc, s) => acc + s.timeSlot.desirabilityScore, 0) / sessions.length
          : 0;
      return {
        teacherId: t.id,
        teacherName: t.user.name,
        totalHours,
        undesirableSlotCount: undesirableCount,
        desirabilityIndexAverage: Math.round(desirabilityAvg * 100) / 100,
      };
    })
  );

  // Gini coefficient
  const values = distribution.map((d) => d.undesirableSlotCount);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let gini = 0;
  if (mean > 0) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sum += Math.abs(values[i] - values[j]);
      }
    }
    gini = sum / (2 * n * n * mean);
  }

  res.json({
    success: true,
    data: {
      overallGini: Math.round(gini * 1000) / 1000,
      averageUndesirableSlots: Math.round(mean * 100) / 100,
      teacherDistribution: distribution,
    },
  });
};

// ===================== ATTENDANCE TRENDS =====================
export const getAttendanceTrends = async (req: Request, res: Response): Promise<void> => {
  const sessions = await prisma.session.findMany({
    where: { status: 'COMPLETED' },
    include: {
      attendances: true,
      timeSlot: true,
      course: true,
      batch: true,
    },
    take: 200,
    orderBy: { date: 'desc' },
  });

  const trendsBySlot = sessions.reduce<Record<number, { total: number; present: number }>>((acc, s) => {
    const slot = s.timeSlot.slotNumber;
    const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
    const total = s.attendances.length;
    if (!acc[slot]) acc[slot] = { total: 0, present: 0 };
    acc[slot].total += total;
    acc[slot].present += present;
    return acc;
  }, {});

  const trends = Object.entries(trendsBySlot).map(([slot, data]) => ({
    slotNumber: Number(slot),
    attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 1000) / 10 : 0,
    sessions: data.total,
  }));

  res.json({ success: true, data: trends.sort((a, b) => a.slotNumber - b.slotNumber) });
};

// ===================== PRODUCTIVITY =====================
export const getProductivity = async (req: Request, res: Response): Promise<void> => {
  const { teacherId, courseId } = req.query;
  const where: any = {};
  if (teacherId) where.session = { teacherId };
  if (courseId) where.session = { ...where.session, courseId };

  const scores = await prisma.productivityScore.findMany({
    where,
    include: {
      session: {
        include: {
          course: { select: { name: true, code: true } },
          teacher: { include: { user: { select: { name: true } } } },
          timeSlot: true,
        },
      },
    },
    orderBy: { computedAt: 'desc' },
    take: 100,
  });

  res.json({ success: true, data: scores });
};

// ===================== INSTITUTIONAL STATS =====================
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalTeachers, totalStudents, totalCourses, totalSessions, publishedSchedules] = await Promise.all([
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.course.count(),
    prisma.session.count({ where: { status: 'SCHEDULED' } }),
    prisma.schedule.count({ where: { status: 'PUBLISHED' } }),
  ]);

  res.json({
    success: true,
    data: { totalTeachers, totalStudents, totalCourses, totalSessions, publishedSchedules },
  });
};
