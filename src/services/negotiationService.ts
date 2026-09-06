import { prisma } from '../config/prisma.js';
import { ProposeNegotiationDTO, RespondNegotiationDTO, UserRole } from '../types/index.js';
import { NegotiationStatus, NegotiationType } from '@prisma/client';
import { OrderService } from './orderService.js';
import { getSocketServer } from '../websocket/orderSocket.js';

export class NegotiationService {
  static async proposeNegotiation(
    orderId: string,
    userId: string,
    userRole: UserRole,
    dto: ProposeNegotiationDTO
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, farmer: true, listing: true }
    });

    if (!order) throw new Error('Order not found');
    if (order.buyerId !== userId && order.farmerId !== userId) {
      throw new Error('Unauthorized to negotiate on this order');
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Negotiation is only allowed on PENDING orders. Current status: ${order.status}`);
    }

    let previousValue = '';
    let messageText = '';
    const proposedValStr = String(dto.proposedValue);

    if (dto.type === 'PRICE_COUNTER') {
      previousValue = String(order.unitPrice);
      messageText = `Proposed new counter-offer price: ₦${Number(dto.proposedValue).toLocaleString()}/unit (previous: ₦${Number(previousValue).toLocaleString()}).`;
    } else if (dto.type === 'QUANTITY_CHANGE') {
      previousValue = String(order.quantity);
      messageText = `Proposed quantity adjustment: ${dto.proposedValue} units (previous: ${previousValue} ${order.unit}).`;
    } else if (dto.type === 'LOCATION_CHANGE') {
      previousValue = order.deliveryAddress;
      messageText = `Proposed new pickup/delivery location: ${dto.proposedValue}.`;
    }

    const proposal = await prisma.$transaction(async (tx) => {
      // 1. Create proposal
      const prop = await tx.orderNegotiation.create({
        data: {
          orderId,
          senderId: userId,
          senderRole: userRole,
          type: dto.type as NegotiationType,
          proposedValue: proposedValStr,
          previousValue,
          status: NegotiationStatus.PENDING
        }
      });

      // 2. Post proposal message to order chat
      await tx.message.create({
        data: {
          orderId,
          senderId: userId,
          text: messageText,
          proposalId: prop.id,
          isMasked: false,
          isRead: false
        }
      });

      return prop;
    });

    // Broadcast via WebSockets
    const io = getSocketServer();
    if (io) {
      io.to(`order_${orderId}`).emit('negotiation_updated', {
        proposalId: proposal.id,
        orderId,
        type: proposal.type,
        proposedValue: proposal.proposedValue,
        previousValue: proposal.previousValue,
        status: proposal.status,
        senderRole: proposal.senderRole
      });
    }

    return OrderService.getOrderById(orderId);
  }

  static async respondToNegotiation(
    orderId: string,
    proposalId: string,
    userId: string,
    dto: RespondNegotiationDTO
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
        negotiations: true
      }
    });

    if (!order) throw new Error('Order not found');
    if (order.buyerId !== userId && order.farmerId !== userId) {
      throw new Error('Unauthorized to respond on this order');
    }

    const proposal = await prisma.orderNegotiation.findUnique({
      where: { id: proposalId }
    });

    if (!proposal || proposal.orderId !== orderId) {
      throw new Error('Negotiation proposal not found');
    }

    if (proposal.senderId === userId) {
      throw new Error('You cannot respond to your own proposal');
    }

    if (proposal.status !== 'PENDING') {
      throw new Error(`Proposal has already been ${proposal.status.toLowerCase()}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update proposal status
      await tx.orderNegotiation.update({
        where: { id: proposalId },
        data: { status: dto.decision as NegotiationStatus }
      });

      // 2. If accepted, update order parameters in DB
      if (dto.decision === 'ACCEPTED') {
        const updateData: any = {};
        if (proposal.type === 'PRICE_COUNTER') {
          const newUnitPrice = Number(proposal.proposedValue);
          updateData.unitPrice = newUnitPrice;
          updateData.totalAmount = newUnitPrice * order.quantity;
        } else if (proposal.type === 'QUANTITY_CHANGE') {
          const newQuantity = Number(proposal.proposedValue);
          updateData.quantity = newQuantity;
          updateData.totalAmount = Number(order.unitPrice) * newQuantity;
        } else if (proposal.type === 'LOCATION_CHANGE') {
          updateData.deliveryAddress = proposal.proposedValue;
        }

        await tx.order.update({
          where: { id: orderId },
          data: updateData
        });
      }

      // 3. Post system message confirming resolution
      const resolutionText = `Negotiation proposal was ${dto.decision.toLowerCase()}! ${
        dto.decision === 'ACCEPTED' ? 'Order terms have been updated automatically.' : 'Previous order terms remain active.'
      }`;

      await tx.message.create({
        data: {
          orderId,
          senderId: 'system',
          text: resolutionText,
          isMasked: false,
          isRead: false
        }
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: true,
          farmer: { include: { farmerProfile: true } },
          listing: true,
          negotiations: { orderBy: { createdAt: 'desc' } }
        }
      });
    });

    // Broadcast via WebSockets
    const io = getSocketServer();
    if (io) {
      io.to(`order_${orderId}`).emit('negotiation_updated', {
        proposalId,
        orderId,
        decision: dto.decision
      });
      io.to(`order_${orderId}`).emit('new_order_message', {
        orderId,
        senderId: 'system',
        text: `Negotiation proposal was ${dto.decision.toLowerCase()}!`,
        timestamp: new Date().toISOString()
      });
    }

    return OrderService.formatOrder(updated);
  }
}
