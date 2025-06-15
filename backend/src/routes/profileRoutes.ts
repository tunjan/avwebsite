import { Router } from 'express';
import { getMyProfile } from '../controllers/profileController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/me', isAuthenticated, getMyProfile);

export default router;