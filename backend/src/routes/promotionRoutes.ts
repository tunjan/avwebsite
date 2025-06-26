import { Router } from 'express';
import { promoteUser } from '../controllers/promotionController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.post('/:userIdToPromote', isAuthenticated, asyncHandler(promoteUser));

export default router;