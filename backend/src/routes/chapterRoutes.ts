import { Router } from 'express';
import {
    getAllChapters,
    getChapterStats,
    getMyChapters,
    requestToJoinChapter,
    getPendingRequests,
    manageJoinRequest,
    getChapterMembers,
    addChapterMember,
    removeChapterMember,
    getChaptersByRegion,
    createChapter,
    getMyManagedChapters,
    becomeOfficialMember
} from '../controllers/chapterController';
import { isAuthenticated, canManageChapterMembers, canCreateChapter } from '../middleware/auth';

const router = Router();

// --- General & Member Routes ---
router.get('/', isAuthenticated, getAllChapters);
router.get('/my-chapters', isAuthenticated, getMyChapters);
router.get('/my-managed', isAuthenticated, getMyManagedChapters);
router.get('/:chapterId/stats', isAuthenticated, getChapterStats);
router.post('/:chapterId/request-join', isAuthenticated, requestToJoinChapter);
router.post('/:chapterId/become-member', isAuthenticated, becomeOfficialMember);

// --- Management Routes (All protected by canManageChapterMembers) ---
router.get('/:chapterId/members', isAuthenticated, canManageChapterMembers, getChapterMembers);
router.post('/:chapterId/members/:userId', isAuthenticated, canManageChapterMembers, addChapterMember);
router.delete('/:chapterId/members/:userId', isAuthenticated, canManageChapterMembers, removeChapterMember);
router.get('/:chapterId/join-requests', isAuthenticated, canManageChapterMembers, getPendingRequests);
router.post('/:chapterId/join-requests/:requestId', isAuthenticated, canManageChapterMembers, manageJoinRequest);

// --- Creation & Utility Routes ---
router.get('/in-region/:regionId', isAuthenticated, getChaptersByRegion);
router.post('/', isAuthenticated, canCreateChapter, createChapter);

export default router;