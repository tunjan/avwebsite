import { Router } from 'express';
import { getPublicChapters } from '../controllers/publicController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/chapters', asyncHandler(getPublicChapters));

export default router;