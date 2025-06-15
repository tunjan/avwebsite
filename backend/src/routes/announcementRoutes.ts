import { Router } from 'express';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementById } from '../controllers/announcementController';
import { isAuthenticated, canCreateContent, canModifyContent, attachModificationPermission } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getAnnouncements);
router.post('/', isAuthenticated, canCreateContent, createAnnouncement);

router.get('/:announcementId', isAuthenticated, attachModificationPermission, getAnnouncementById);
router.put('/:announcementId', isAuthenticated, canModifyContent, updateAnnouncement);
router.delete('/:announcementId', isAuthenticated, canModifyContent, deleteAnnouncement);

export default router;