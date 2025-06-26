import { Router } from 'express';
import { getUserStats, getOrganizerSummary } from '../controllers/dashboardController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/stats', isAuthenticated, asyncHandler(getUserStats));
router.get('/organizer-summary', isAuthenticated, asyncHandler(getOrganizerSummary));

export default router;