import { Router } from 'express';
import { searchUsers } from '../controllers/userController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/search', isAuthenticated, asyncHandler(searchUsers));

export default router;