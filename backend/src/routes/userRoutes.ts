import { Router } from 'express';
import { searchUsers } from '../controllers/userController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/search', isAuthenticated, searchUsers);

export default router;