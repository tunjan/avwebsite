import { Router } from 'express';
import { getPublicTeams } from '../controllers/publicController';
const router = Router();

// This route does NOT have the isAuthenticated middleware
router.get('/teams', getPublicTeams);

export default router;