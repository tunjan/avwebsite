import { Router } from 'express';
import { getUserStats, getOrganizerSummary } from '../controllers/dashboardController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// This route requires the user to be logged in
router.get('/stats', isAuthenticated, getUserStats);
router.get('/organizer-summary', isAuthenticated, getOrganizerSummary);

export default router;