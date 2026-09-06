import { prisma } from '../config/prisma.js';
import { sanitizeMessageContent } from '../utils/sanitizer.js';
import { getSocketServer } from '../websocket/orderSocket.js';
import { JwtPayload } from '../types/index.js';

export class ChatService {
  static async getOrderChat(orderId: string, user: JwtPayload) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        farmer: { include: { farmerProfile: true } },
        listing: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { proposal: true }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (user.role !== 'admin' && order.buyerId !== user.id && order.farmerId !== user.id) {
      throw new Error('Unauthorized access to order chat');
    }

    const messages = order.messages.map((m) => {
      let senderName = 'RUUTED Escrow Guard';
      let senderRole = 'system';

      if (m.senderId === order.buyerId) {
        senderName = order.buyer.name;
        senderRole = 'buyer';
      } else if (m.senderId === order.farmerId) {
        senderName = order.farmer.name;
        senderRole = 'farmer';
      }

      return {
        id: m.id,
        orderId: m.orderId,
        senderId: m.senderId,
        senderName,
        senderRole,
        text: m.text,
        isMasked: m.isMasked,
        proposalId: m.proposalId,
        proposal: m.proposal
          ? {
              id: m.proposal.id,
              type: m.proposal.type,
              proposedValue: m.proposal.proposedValue,
              previousValue: m.proposal.previousValue,
              status: m.proposal.status
            }
          : undefined,
        timestamp: m.createdAt.toISOString(),
        read: m.isRead
      };
    });

    return {
      id: `conv_${order.id}`,
      orderId: order.id,
      listingId: order.listingId,
      listingTitle: order.listing.productName,
      buyerId: order.buyerId,
      buyerName: order.buyer.name,
      farmerId: order.farmerId,
      farmerName: order.farmer.name,
      farmName: order.farmer.farmerProfile?.farmName || `${order.farmer.name} Farm`,
      unreadCount: messages.filter((m) => !m.read && m.senderId !== user.id).length,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].text : '',
      lastMessageTimestamp:
        messages.length > 0
          ? messages[messages.length - 1].timestamp
          : order.createdAt.toISOString(),
      messages
    };
  }

  static async sendOrderMessage(
    orderId: string,
    senderId: string,
    text: string,
    proposalId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, farmer: true }
    });

    if (!order) throw new Error('Order not found');
    if (senderId !== 'system' && order.buyerId !== senderId && order.farmerId !== senderId) {
      throw new Error('Unauthorized to send message to this order thread');
    }

    // Server-side Anti-Circumvention Filter
    const { sanitizedText, isMasked } = sanitizeMessageContent(text);

    const message = await prisma.message.create({
      data: {
        orderId,
        senderId,
        text: sanitizedText,
        isMasked,
        proposalId,
        isRead: false
      },
      include: { proposal: true }
    });

    let senderName = 'RUUTED Escrow Guard';
    let senderRole = 'system';
    if (senderId === order.buyerId) {
      senderName = order.buyer.name;
      senderRole = 'buyer';
    } else if (senderId === order.farmerId) {
      senderName = order.farmer.name;
      senderRole = 'farmer';
    }

    const payload = {
      id: message.id,
      orderId: message.orderId,
      senderId: message.senderId,
      senderName,
      senderRole,
      text: message.text,
      isMasked: message.isMasked,
      proposalId: message.proposalId,
      proposal: message.proposal
        ? {
            id: message.proposal.id,
            type: message.proposal.type,
            proposedValue: message.proposal.proposedValue,
            previousValue: message.proposal.previousValue,
            status: message.proposal.status
          }
        : undefined,
      timestamp: message.createdAt.toISOString(),
      read: message.isRead
    };

    // Broadcast over WebSockets to order room
    const io = getSocketServer();
    if (io) {
      io.to(`order_${orderId}`).emit('new_order_message', payload);
    }

    return payload;
  }
}
