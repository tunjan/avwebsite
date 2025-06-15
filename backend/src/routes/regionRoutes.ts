import { Router } from 'express';
import { getAllRegions, getRegionById } from '../controllers/regionController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getAllRegions);
router.get('/:regionId', isAuthenticated, getRegionById);

export default router;