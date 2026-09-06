import { Router } from 'express';
import {
  PestController,
  diagnoseCropSchema,
  pestMessageSchema
} from '../controllers/pestController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';

const router = Router();

router.post(
  '/diagnose',
  authenticate,
  validateBody(diagnoseCropSchema),
  PestController.diagnose
);

router.get('/history', authenticate, PestController.getHistory);
router.get('/:id', authenticate, PestController.getById);

router.post(
  '/:id/messages',
  authenticate,
  validateBody(pestMessageSchema),
  PestController.addMessage
);

export default router;
