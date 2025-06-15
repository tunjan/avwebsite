import { Router } from 'express';
import { getAllResources } from '../controllers/resourceController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getAllResources);

export default router;