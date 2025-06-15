import { Router } from 'express';
import { getComments, createComment } from '../controllers/commentController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getComments);
router.post('/', isAuthenticated, createComment);

export default router;