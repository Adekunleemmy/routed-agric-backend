import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chatService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const sendChatMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty')
});

export class ChatController {
  static async getChat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const orderId = String(req.params.id);
      const chat = await ChatService.getOrderChat(orderId, req.user);
      return sendSuccess(res, chat, 'Order chat conversation retrieved');
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const orderId = String(req.params.id);
      const message = await ChatService.sendOrderMessage(
        orderId,
        req.user.id,
        req.body.text
      );
      return sendSuccess(res, message, 'Message sent successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
