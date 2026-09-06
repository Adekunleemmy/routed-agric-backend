import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/orderService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const createOrderSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  deliveryState: z.string().min(2, 'Delivery state is required'),
  deliveryLga: z.string().min(2, 'Delivery LGA is required'),
  deliveryAddress: z.string().min(5, 'Detailed delivery address is required'),
  preferredDate: z.string().min(4, 'Preferred delivery date is required'),
  buyerNote: z.string().optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'COMPLETED']),
  rejectionReason: z.string().optional()
});

export class OrderController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const order = await OrderService.createOrder(req.user.id, req.body);
      return sendSuccess(res, order, 'Order created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const orders = await OrderService.getOrders(req.user, req.query.status as string);
      return sendSuccess(res, orders, 'Orders retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      const order = await OrderService.getOrderById(id, req.user);
      return sendSuccess(res, order, 'Order retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const { status, rejectionReason } = req.body;
      const id = String(req.params.id);
      const order = await OrderService.updateStatus(id, req.user.id, status, rejectionReason);
      return sendSuccess(res, order, `Order marked as ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async initializePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      const result = await OrderService.initializePayment(id, req.user);
      return sendSuccess(res, result, 'Escrow payment initialized');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async paystackWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = (req.headers['x-paystack-signature'] as string) || '';
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const result = await OrderService.handlePaystackWebhook(req.body, rawBody, signature);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[Paystack Webhook Error]', err.message);
      return res.status(400).json({ error: err.message });
    }
  }
}
