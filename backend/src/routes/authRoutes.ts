import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', isAuthenticated, getMe);

export default router;