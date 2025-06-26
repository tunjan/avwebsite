import { Router } from 'express';
import { getComments, createComment } from '../controllers/commentController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', isAuthenticated, asyncHandler(getComments));
router.post('/', isAuthenticated, asyncHandler(createComment));

export default router;