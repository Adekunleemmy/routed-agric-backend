import { Request, Response, NextFunction } from 'express';
import { KnowledgeService } from '../services/knowledgeService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const askKnowledgeSchema = z.object({
  category: z.string().min(2, 'Category is required'),
  question: z.string().min(5, 'Question must be at least 5 characters')
});

export const saveGuideSchema = z.object({
  category: z.string().min(2, 'Category is required'),
  title: z.string().min(3, 'Title is required'),
  summary: z.string().min(5, 'Summary is required'),
  fullContent: z.string().min(10, 'Full content is required')
});

export class KnowledgeController {
  static async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await KnowledgeService.askQuestion(req.body);
      return sendSuccess(res, result, 'Agronomic advice retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getSaved(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const items = await KnowledgeService.getSaved(req.user.id);
      return sendSuccess(res, items, 'Saved agronomy guides retrieved');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async save(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const guide = await KnowledgeService.saveGuide(req.user.id, req.body);
      return sendSuccess(res, guide, 'Agronomy guide saved successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deleteSaved(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      await KnowledgeService.deleteSaved(id, req.user.id);
      return sendSuccess(res, { deleted: true }, 'Saved guide deleted');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
