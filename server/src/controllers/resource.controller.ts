import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// Generic CRUD helpers for most resources

// ===================== DEPARTMENTS =====================
export const getDepartments = async (_req: Request, res: Response) => {
  const items = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: items });
};

export const createDepartment = async (req: Request, res: Response) => {
  const dept = await prisma.department.create({ data: req.body });
  res.status(201).json({ success: true, data: dept });
};

// ===================== TEACHERS =====================
export const getTeachers = async (_req: Request, res: Response) => {
  const items = await prisma.teacher.findMany({
    include: { user: { select: { id: true, name: true, email: true } }, department: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: items });
};

export const createTeacher = async (req: Request, res: Response) => {
  const { userId, departmentId, designation, maxWeeklyLoad, preferences } = req.body;
  const teacher = await prisma.teacher.create({
    data: { userId, departmentId, designation, maxWeeklyLoad, preferences },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json({ success: true, data: teacher });
};

export const updateTeacher = async (req: Request, res: Response) => {
  const { id } = req.params;
  const teacher = await prisma.teacher.update({ where: { id }, data: req.body });
  res.json({ success: true, data: teacher });
};

export const deleteTeacher = async (req: Request, res: Response) => {
  await prisma.teacher.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Teacher deleted' });
};

// ===================== BATCHES =====================
export const getBatches = async (_req: Request, res: Response) => {
  const items = await prisma.batch.findMany({
    include: { department: true, _count: { select: { students: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: items });
};

export const createBatch = async (req: Request, res: Response) => {
  const batch = await prisma.batch.create({ data: req.body });
  res.status(201).json({ success: true, data: batch });
};

export const updateBatch = async (req: Request, res: Response) => {
  const batch = await prisma.batch.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: batch });
};

export const deleteBatch = async (req: Request, res: Response) => {
  await prisma.batch.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Batch deleted' });
};

// ===================== COURSES =====================
export const getCourses = async (_req: Request, res: Response) => {
  const items = await prisma.course.findMany({
    include: { department: true },
    orderBy: { code: 'asc' },
  });
  res.json({ success: true, data: items });
};

export const createCourse = async (req: Request, res: Response) => {
  const course = await prisma.course.create({ data: req.body });
  res.status(201).json({ success: true, data: course });
};

export const updateCourse = async (req: Request, res: Response) => {
  const course = await prisma.course.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: course });
};

export const deleteCourse = async (req: Request, res: Response) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Course deleted' });
};

// ===================== ROOMS =====================
export const getRooms = async (_req: Request, res: Response) => {
  const items = await prisma.room.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: items });
};

export const createRoom = async (req: Request, res: Response) => {
  const room = await prisma.room.create({ data: req.body });
  res.status(201).json({ success: true, data: room });
};

export const updateRoom = async (req: Request, res: Response) => {
  const room = await prisma.room.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: room });
};

export const deleteRoom = async (req: Request, res: Response) => {
  await prisma.room.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Room deleted' });
};

// ===================== TIMESLOTS =====================
export const getTimeSlots = async (_req: Request, res: Response) => {
  const items = await prisma.timeSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { slotNumber: 'asc' }] });
  res.json({ success: true, data: items });
};

// ===================== HOLIDAYS =====================
export const getHolidays = async (_req: Request, res: Response) => {
  const items = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  res.json({ success: true, data: items });
};

export const createHoliday = async (req: Request, res: Response) => {
  const holiday = await prisma.holiday.create({ data: { ...req.body, date: new Date(req.body.date) } });
  res.status(201).json({ success: true, data: holiday });
};

export const deleteHoliday = async (req: Request, res: Response) => {
  await prisma.holiday.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Holiday deleted' });
};

// ===================== EVENTS =====================
export const getEvents = async (_req: Request, res: Response) => {
  const items = await prisma.event.findMany({ orderBy: { startDate: 'asc' } });
  res.json({ success: true, data: items });
};

export const createEvent = async (req: Request, res: Response) => {
  const event = await prisma.event.create({
    data: { ...req.body, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate) },
  });
  res.status(201).json({ success: true, data: event });
};

export const deleteEvent = async (req: Request, res: Response) => {
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Event deleted' });
};

// ===================== CONSTRAINTS =====================
export const getConstraints = async (_req: Request, res: Response) => {
  const items = await prisma.constraint.findMany();
  res.json({ success: true, data: items });
};
