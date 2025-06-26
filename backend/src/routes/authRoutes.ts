import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', isAuthenticated, asyncHandler(getMe));

export default router;