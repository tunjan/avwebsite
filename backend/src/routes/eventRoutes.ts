import { Router } from 'express';
import {
    createEvent, getEvents, getEventById, updateEvent, deleteEvent,
    rsvpToEvent, cancelRsvp, getEventAttendees,
    getEventRegistrations, updateAttendance
} from '../controllers/eventController';
import { isAuthenticated, canCreateContent, canModifyContent, attachModificationPermission } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', isAuthenticated, asyncHandler(getEvents));
router.post('/', isAuthenticated, canCreateContent, asyncHandler(createEvent));

router.get('/:eventId', isAuthenticated, attachModificationPermission, asyncHandler(getEventById));
router.put('/:eventId', isAuthenticated, canModifyContent, asyncHandler(updateEvent));
router.delete('/:eventId', isAuthenticated, canModifyContent, asyncHandler(deleteEvent));

router.post('/:eventId/rsvp', isAuthenticated, asyncHandler(rsvpToEvent));
router.delete('/:eventId/rsvp', isAuthenticated, asyncHandler(cancelRsvp));

router.get('/:eventId/attendees', isAuthenticated, asyncHandler(getEventAttendees));
router.get('/:eventId/registrations', isAuthenticated, canModifyContent, asyncHandler(getEventRegistrations));
router.patch('/:eventId/registrations/:userId', isAuthenticated, canModifyContent, asyncHandler(updateAttendance));

export default router;