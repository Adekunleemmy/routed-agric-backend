import { Response, NextFunction } from 'express';
import { PestService } from '../services/pestService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const diagnoseCropSchema = z.object({
  crop: z.string().min(2, 'Crop name is required'),
  affectedPart: z.string().min(2, 'Affected part is required'),
  startedAgo: z.string().min(1, 'Onset duration is required'),
  description: z.string().min(5, 'Detailed symptom description is required'),
  imageUrl: z.string().optional()
});

export const pestMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty')
});

export class PestController {
  static async diagnose(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const diagnosis = await PestService.diagnose(req.user.id, req.body);
      return sendSuccess(res, diagnosis, 'Pest & disease diagnosis generated successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const history = await PestService.getHistory(req.user.id);
      return sendSuccess(res, history, 'Diagnosis history retrieved');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      const diagnosis = await PestService.getById(id, req.user.id);
      return sendSuccess(res, diagnosis, 'Diagnosis retrieved');
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async addMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      const updated = await PestService.addMessage(id, req.user.id, req.body.text);
      return sendSuccess(res, updated, 'Follow-up message processed');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
