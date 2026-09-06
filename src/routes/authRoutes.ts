import { Router } from 'express';
import { AuthController, registerSchema, loginSchema } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';

const router = Router();

router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

export default router;
