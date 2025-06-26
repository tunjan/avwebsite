import { Router } from 'express';
import { getAllRegions, getRegionById } from '../controllers/regionController';
import { isAuthenticated } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', isAuthenticated, asyncHandler(getAllRegions));
router.get('/:regionId', isAuthenticated, asyncHandler(getRegionById));

export default router;