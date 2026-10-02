import { Router } from 'express';
import {
  startQrSession,
  scanQr,
  bulkMarkAttendance,
  getSessionAttendance,
  getStudentAttendance,
  submitEngagement,
  submitFeedback,
  computeProductivity,
} from '../controllers/attendance.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
router.use(authenticateToken);

router.post('/session/:id/start-qr', requireRole(['ADMIN', 'TEACHER']), startQrSession);
router.post('/scan-qr', requireRole(['STUDENT']), scanQr);
router.post('/bulk', requireRole(['ADMIN', 'TEACHER']), bulkMarkAttendance);
router.get('/session/:id', getSessionAttendance);
router.get('/student/me', requireRole(['STUDENT']), getStudentAttendance);

router.post('/engagement', requireRole(['ADMIN', 'TEACHER']), submitEngagement);
router.post('/feedback', requireRole(['STUDENT']), submitFeedback);
router.post('/productivity', requireRole(['ADMIN', 'TEACHER']), computeProductivity);

export default router;
