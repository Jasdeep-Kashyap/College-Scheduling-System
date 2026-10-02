import { Router } from 'express';
import {
  getTimetable,
  generateTimetable,
  overrideSession,
  publishSchedule,
} from '../controllers/timetable.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getTimetable);
router.post('/generate', requireRole(['ADMIN']), generateTimetable);
router.put('/session/:id', requireRole(['ADMIN']), overrideSession);
router.post('/publish', requireRole(['ADMIN']), publishSchedule);

export default router;
