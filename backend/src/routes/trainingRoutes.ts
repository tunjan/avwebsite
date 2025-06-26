import { Router } from 'express';
import {
    getTrainings, createTraining, getTrainingById, updateTraining, deleteTraining,
    rsvpToTraining, cancelRsvp
} from '../controllers/trainingController';
import { isAuthenticated, canCreateContent, canModifyContent, attachModificationPermission } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', isAuthenticated, asyncHandler(getTrainings));
router.post('/', isAuthenticated, canCreateContent, asyncHandler(createTraining));

router.get('/:trainingId', isAuthenticated, attachModificationPermission, asyncHandler(getTrainingById));
router.put('/:trainingId', isAuthenticated, canModifyContent, asyncHandler(updateTraining));
router.delete('/:trainingId', isAuthenticated, canModifyContent, asyncHandler(deleteTraining));

router.post('/:trainingId/rsvp', isAuthenticated, asyncHandler(rsvpToTraining));
router.delete('/:trainingId/rsvp', isAuthenticated, asyncHandler(cancelRsvp));

export default router;