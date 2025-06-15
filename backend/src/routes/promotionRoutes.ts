import { Router } from 'express';
import { promoteUser } from '../controllers/promotionController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.post('/:userIdToPromote', isAuthenticated, promoteUser);

export default router;