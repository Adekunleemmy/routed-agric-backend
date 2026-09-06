import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters'),
  role: z.enum(['buyer', 'farmer', 'admin']).default('buyer'),
  state: z.string().min(2, 'State is required'),
  lga: z.string().min(2, 'LGA is required'),
  farmName: z.string().optional(),
  farmLocation: z.string().optional(),
  description: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      return sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated', 401);
      }
      const user = await AuthService.getCurrentUser(req.user.id);
      return sendSuccess(res, user, 'User profile retrieved');
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }
}
