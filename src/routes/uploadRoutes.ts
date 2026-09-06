import { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { upload } from '../integrations/storage.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/single', authenticate, upload.single('image'), UploadController.uploadSingle);
router.post('/multiple', authenticate, upload.array('images', 5), UploadController.uploadMultiple);

export default router;
