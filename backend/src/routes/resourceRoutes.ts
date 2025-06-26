import { Router } from 'express';
import { getAllResources } from '../controllers/resourceController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', isAuthenticated, asyncHandler(getAllResources));

export default router;