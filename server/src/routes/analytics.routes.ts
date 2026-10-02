import { Router } from 'express';
import { getFairness, getAttendanceTrends, getProductivity, getDashboardStats } from '../controllers/analytics.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/fairness', getFairness);
router.get('/attendance-trends', getAttendanceTrends);
router.get('/productivity', getProductivity);
router.get('/stats', getDashboardStats);

export default router;
