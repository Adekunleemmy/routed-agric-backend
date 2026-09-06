import { Router } from 'express';
import {
  KnowledgeController,
  askKnowledgeSchema,
  saveGuideSchema
} from '../controllers/knowledgeController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';

const router = Router();

router.post('/ask', validateBody(askKnowledgeSchema), KnowledgeController.ask);
router.get('/saved', authenticate, KnowledgeController.getSaved);
router.post('/save', authenticate, validateBody(saveGuideSchema), KnowledgeController.save);
router.delete('/saved/:id', authenticate, KnowledgeController.deleteSaved);

export default router;
