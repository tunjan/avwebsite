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
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// --- General & Member Routes ---
router.get('/', isAuthenticated, asyncHandler(getAllChapters));
router.get('/my-chapters', isAuthenticated, asyncHandler(getMyChapters));
router.get('/my-managed', isAuthenticated, asyncHandler(getMyManagedChapters));
router.get('/:chapterId/stats', isAuthenticated, asyncHandler(getChapterStats));
router.post('/:chapterId/request-join', isAuthenticated, asyncHandler(requestToJoinChapter));
router.post('/:chapterId/become-member', isAuthenticated, asyncHandler(becomeOfficialMember));

// --- Management Routes (All protected by canManageChapterMembers) ---
router.get('/:chapterId/members', isAuthenticated, canManageChapterMembers, asyncHandler(getChapterMembers));
router.post('/:chapterId/members/:userId', isAuthenticated, canManageChapterMembers, asyncHandler(addChapterMember));
router.delete('/:chapterId/members/:userId', isAuthenticated, canManageChapterMembers, asyncHandler(removeChapterMember));
router.get('/:chapterId/join-requests', isAuthenticated, canManageChapterMembers, asyncHandler(getPendingRequests));
router.post('/:chapterId/join-requests/:requestId', isAuthenticated, canManageChapterMembers, asyncHandler(manageJoinRequest));

// --- Creation & Utility Routes ---
router.get('/in-region/:regionId', isAuthenticated, asyncHandler(getChaptersByRegion));
router.post('/', isAuthenticated, canCreateChapter, asyncHandler(createChapter));

export default router;