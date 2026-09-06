import { Response, NextFunction } from 'express';
import { NegotiationService } from '../services/negotiationService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const proposeNegotiationSchema = z.object({
  type: z.enum(['PRICE_COUNTER', 'QUANTITY_CHANGE', 'LOCATION_CHANGE']),
  proposedValue: z.union([z.string(), z.number()])
});

export const respondNegotiationSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DECLINED'])
});

export class NegotiationController {
  static async propose(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const orderId = String(req.params.id);
      const updatedOrder = await NegotiationService.proposeNegotiation(
        orderId,
        req.user.id,
        req.user.role,
        req.body
      );
      return sendSuccess(res, updatedOrder, 'Negotiation proposal sent successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async respond(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const orderId = String(req.params.id);
      const proposalId = String(req.params.proposalId);
      const updatedOrder = await NegotiationService.respondToNegotiation(
        orderId,
        proposalId,
        req.user.id,
        req.body
      );
      return sendSuccess(res, updatedOrder, `Negotiation proposal ${req.body.decision.toLowerCase()}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
