import { Router } from 'express';
import {
    getTrainings, createTraining, getTrainingById, updateTraining, deleteTraining,
    rsvpToTraining, cancelRsvp
} from '../controllers/trainingController';
import { isAuthenticated, canCreateContent, canModifyContent, attachModificationPermission } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getTrainings);
router.post('/', isAuthenticated, canCreateContent, createTraining);

router.get('/:trainingId', isAuthenticated, attachModificationPermission, getTrainingById);
router.put('/:trainingId', isAuthenticated, canModifyContent, updateTraining);
router.delete('/:trainingId', isAuthenticated, canModifyContent, deleteTraining);

router.post('/:trainingId/rsvp', isAuthenticated, rsvpToTraining);
router.delete('/:trainingId/rsvp', isAuthenticated, cancelRsvp);

export default router;