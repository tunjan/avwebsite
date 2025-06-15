import { Router } from 'express';
// Add the new controller functions to the import
import { createEvent, getEvents, rsvpToEvent, getEventAttendees, getEventRegistrations, updateAttendance, cancelRsvp, getEventById } from '../controllers/eventController';
import { isAuthenticated, canCreateEvents, canManageEvent } from '../middleware/auth';
const router = Router();

// Use the new, specific middleware for the creation route
router.post('/', isAuthenticated, canCreateEvents, createEvent);

// The GET route can remain as is
router.get('/', isAuthenticated, getEvents);

// NEW: Route for RSVPing to a specific event
router.post('/:eventId/rsvp', isAuthenticated, rsvpToEvent);

// NEW: Route to get the list of attendees for an event
router.get('/:eventId/attendees', isAuthenticated, getEventAttendees);
router.get('/:eventId', isAuthenticated, getEventById); // For event detail page
router.delete('/:eventId/rsvp', isAuthenticated, cancelRsvp); // For cancelling

router.get('/:eventId/registrations', isAuthenticated, canManageEvent, getEventRegistrations);
router.patch('/:eventId/registrations/:userId', isAuthenticated, canManageEvent, updateAttendance);


export default router;