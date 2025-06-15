import { Router } from 'express';
import { getMyProfileData } from '../controllers/profileController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// This route requires the user to be logged in to get their own profile data
router.get('/me', isAuthenticated, getMyProfileData);

export default router;