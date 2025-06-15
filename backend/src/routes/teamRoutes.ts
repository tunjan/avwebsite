import { Router } from 'express';
import {
    getAllTeams,
    getTeamStats,
    getMyTeams,
    requestToJoinTeam,
    getPendingRequests,
    manageJoinRequest,
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
    getTeamsByRegion
} from '../controllers/teamController';
import { isAuthenticated, canManageTeamMembers, canViewTeam } from '../middleware/auth';

const router = Router();

// --- Public / Member Routes ---
router.get('/', isAuthenticated, getAllTeams);
router.get('/my-teams', isAuthenticated, getMyTeams);
router.get('/:teamId/stats', isAuthenticated, getTeamStats);
router.post('/:teamId/request-join', isAuthenticated, requestToJoinTeam); // <-- CHANGED FROM /join

// --- Management & Viewing Routes ---
router.get('/:teamId/members', isAuthenticated, canViewTeam, getTeamMembers);
router.post('/:teamId/members/:userId', isAuthenticated, canManageTeamMembers, addTeamMember);
router.delete('/:teamId/members/:userId', isAuthenticated, canManageTeamMembers, removeTeamMember);
router.get('/:teamId/join-requests', isAuthenticated, canManageTeamMembers, getPendingRequests); // <-- NEW
router.post('/:teamId/join-requests/:requestId', isAuthenticated, canManageTeamMembers, manageJoinRequest); // <-- NEW
router.get('/in-region/:regionId', isAuthenticated, getTeamsByRegion);


export default router;