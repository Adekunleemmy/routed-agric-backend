import { Router } from 'express';
import {
  OrderController,
  createOrderSchema,
  updateOrderStatusSchema
} from '../controllers/orderController.js';
import {
  NegotiationController,
  proposeNegotiationSchema,
  respondNegotiationSchema
} from '../controllers/negotiationController.js';
import {
  ChatController,
  sendChatMessageSchema
} from '../controllers/chatController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';

const router = Router();

// Paystack Escrow Webhook
router.post('/webhook/paystack', OrderController.paystackWebhook);

// Order lifecycle
router.post(
  '/',
  authenticate,
  requireRole('buyer', 'admin'),
  validateBody(createOrderSchema),
  OrderController.create
);

router.get('/', authenticate, OrderController.getAll);
router.get('/:id', authenticate, OrderController.getById);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('farmer', 'admin'),
  validateBody(updateOrderStatusSchema),
  OrderController.updateStatus
);

router.post(
  '/:id/initialize-payment',
  authenticate,
  requireRole('buyer', 'admin'),
  OrderController.initializePayment
);

// Structured Negotiations
router.post(
  '/:id/negotiations',
  authenticate,
  validateBody(proposeNegotiationSchema),
  NegotiationController.propose
);

router.post(
  '/:id/negotiations/:proposalId/respond',
  authenticate,
  validateBody(respondNegotiationSchema),
  NegotiationController.respond
);

// Order-Tied Chat
router.get('/:id/chat', authenticate, ChatController.getChat);
router.post(
  '/:id/chat/messages',
  authenticate,
  validateBody(sendChatMessageSchema),
  ChatController.sendMessage
);

export default router;
