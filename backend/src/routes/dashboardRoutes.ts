import { Router } from 'express';
import { getUserStats, getOrganizerSummary } from '../controllers/dashboardController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/stats', isAuthenticated, getUserStats);
router.get('/organizer-summary', isAuthenticated, getOrganizerSummary);

export default router;