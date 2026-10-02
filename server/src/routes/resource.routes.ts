import { Router } from 'express';
import {
  getDepartments, createDepartment,
  getTeachers, createTeacher, updateTeacher, deleteTeacher,
  getBatches, createBatch, updateBatch, deleteBatch,
  getCourses, createCourse, updateCourse, deleteCourse,
  getRooms, createRoom, updateRoom, deleteRoom,
  getTimeSlots,
  getHolidays, createHoliday, deleteHoliday,
  getEvents, createEvent, deleteEvent,
  getConstraints,
} from '../controllers/resource.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
router.use(authenticateToken);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', requireRole(['ADMIN']), createDepartment);

// Teachers
router.get('/teachers', getTeachers);
router.post('/teachers', requireRole(['ADMIN']), createTeacher);
router.put('/teachers/:id', requireRole(['ADMIN']), updateTeacher);
router.delete('/teachers/:id', requireRole(['ADMIN']), deleteTeacher);

// Batches
router.get('/batches', getBatches);
router.post('/batches', requireRole(['ADMIN']), createBatch);
router.put('/batches/:id', requireRole(['ADMIN']), updateBatch);
router.delete('/batches/:id', requireRole(['ADMIN']), deleteBatch);

// Courses
router.get('/courses', getCourses);
router.post('/courses', requireRole(['ADMIN']), createCourse);
router.put('/courses/:id', requireRole(['ADMIN']), updateCourse);
router.delete('/courses/:id', requireRole(['ADMIN']), deleteCourse);

// Rooms
router.get('/rooms', getRooms);
router.post('/rooms', requireRole(['ADMIN']), createRoom);
router.put('/rooms/:id', requireRole(['ADMIN']), updateRoom);
router.delete('/rooms/:id', requireRole(['ADMIN']), deleteRoom);

// TimeSlots
router.get('/time-slots', getTimeSlots);

// Holidays
router.get('/holidays', getHolidays);
router.post('/holidays', requireRole(['ADMIN']), createHoliday);
router.delete('/holidays/:id', requireRole(['ADMIN']), deleteHoliday);

// Events
router.get('/events', getEvents);
router.post('/events', requireRole(['ADMIN']), createEvent);
router.delete('/events/:id', requireRole(['ADMIN']), deleteEvent);

// Constraints
router.get('/constraints', getConstraints);

export default router;
