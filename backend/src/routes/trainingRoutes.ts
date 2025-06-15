import { Router } from 'express';
import { getTrainings, rsvpToTraining } from '../controllers/trainingController';
import { isAuthenticated } from '../middleware/auth';
const router = Router();

router.get('/', isAuthenticated, getTrainings);
router.post('/:trainingId/rsvp', isAuthenticated, rsvpToTraining);

export default router;