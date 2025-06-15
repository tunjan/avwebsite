import { Router } from 'express';
import { getPublicChapters } from '../controllers/publicController';

const router = Router();

router.get('/chapters', getPublicChapters);

export default router;