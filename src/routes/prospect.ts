import { Router } from 'express';
import {
  healthHandler,
  prospectarHandler,
} from '../controllers/prospectController';
import { asyncHandler } from '../middleware/errorHandler';
import { validateProspectar } from '../middleware/validator';

const router = Router();

router.post(
  '/prospectar',
  validateProspectar,
  asyncHandler(prospectarHandler),
);

router.get('/health', healthHandler);

export default router;