import { Router } from 'express';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, getAnnouncementById } from '../controllers/announcementController';
import { isAuthenticated, canCreateContent, canModifyContent, attachModificationPermission } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', isAuthenticated, asyncHandler(getAnnouncements));
router.post('/', isAuthenticated, canCreateContent, asyncHandler(createAnnouncement));

router.get('/:announcementId', isAuthenticated, attachModificationPermission, asyncHandler(getAnnouncementById));
router.put('/:announcementId', isAuthenticated, canModifyContent, asyncHandler(updateAnnouncement));
router.delete('/:announcementId', isAuthenticated, canModifyContent, asyncHandler(deleteAnnouncement));

export default router;