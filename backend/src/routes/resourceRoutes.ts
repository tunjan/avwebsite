import { Router } from 'express';
import { getAllResources } from '../controllers/resourceController';
import { isAuthenticated } from '../middleware/auth';
const router = Router();

// A user must be logged in to view resources
router.get('/', isAuthenticated, getAllResources);

export default router;