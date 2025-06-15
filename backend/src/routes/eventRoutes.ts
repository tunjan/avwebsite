import { Router } from 'express';
import {
    createEvent, getEvents, getEventById, updateEvent, deleteEvent,
    rsvpToEvent, cancelRsvp, getEventAttendees,
    getEventRegistrations, updateAttendance
} from '../controllers/eventController';
import { isAuthenticated, canCreateContent, canModifyContent, attachModificationPermission } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getEvents);
router.post('/', isAuthenticated, canCreateContent, createEvent);

router.get('/:eventId', isAuthenticated, attachModificationPermission, getEventById);
router.put('/:eventId', isAuthenticated, canModifyContent, updateEvent);
router.delete('/:eventId', isAuthenticated, canModifyContent, deleteEvent);

router.post('/:eventId/rsvp', isAuthenticated, rsvpToEvent);
router.delete('/:eventId/rsvp', isAuthenticated, cancelRsvp);

router.get('/:eventId/attendees', isAuthenticated, getEventAttendees);
router.get('/:eventId/registrations', isAuthenticated, canModifyContent, getEventRegistrations);
router.patch('/:eventId/registrations/:userId', isAuthenticated, canModifyContent, updateAttendance);

export default router;