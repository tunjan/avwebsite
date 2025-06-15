import { Router } from 'express';
import { getAnnouncements, createAnnouncement } from '../controllers/announcementController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getAnnouncements);
router.post('/', isAuthenticated, createAnnouncement);

export default router;