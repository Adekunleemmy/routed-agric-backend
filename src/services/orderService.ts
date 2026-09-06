import { prisma } from '../config/prisma.js';
import { CreateOrderDTO, JwtPayload, OrderStatusType } from '../types/index.js';
import { OrderStatus } from '@prisma/client';
import { initializePaystackEscrowPayment, disburseFarmerPayout, verifyPaystackSignature } from '../integrations/escrow.js';
import { ChatService } from './chatService.js';

export class OrderService {
  private static generateOrderId(): string {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${year}-${randomSuffix}`;
  }

  static formatOrder(order: any) {
    const activeNegotiation = order.negotiations?.find(
      (n: any) => n.status === 'PENDING'
    ) || order.negotiations?.[0];

    return {
      id: order.id,
      buyerId: order.buyerId,
      buyerName: order.buyer?.name,
      buyerEmail: order.buyer?.email,
      buyerPhone: order.buyer?.phoneNumber,
      farmerId: order.farmerId,
      farmerName: order.farmer?.name,
      farmerPhone: order.farmer?.phoneNumber,
      farmName: order.farmer?.farmerProfile?.farmName || `${order.farmer?.name} Farm`,
      status: order.status,
      rejectionReason: order.rejectionReason,
      escrowFunded: order.escrowFunded,
      totalAmount: Number(order.totalAmount),
      deliveryLocation: {
        state: order.deliveryState,
        lga: order.deliveryLga,
        address: order.deliveryAddress
      },
      preferredDate: order.preferredDate.toISOString().split('T')[0],
      buyerNote: order.buyerNote,
      items: [
        {
          listingId: order.listingId,
          productName: order.listing?.productName || 'Agricultural Produce',
          quantity: order.quantity,
          unit: order.unit,
          unitPrice: Number(order.unitPrice),
          subtotal: Number(order.totalAmount),
          image: order.listing?.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
        }
      ],
      activeNegotiation: activeNegotiation
        ? {
            id: activeNegotiation.id,
            orderId: activeNegotiation.orderId,
            senderId: activeNegotiation.senderId,
            senderRole: activeNegotiation.senderRole,
            type: activeNegotiation.type,
            proposedValue: activeNegotiation.proposedValue,
            previousValue: activeNegotiation.previousValue,
            status: activeNegotiation.status,
            createdAt: activeNegotiation.createdAt.toISOString()
          }
        : undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };
  }

  static async createOrder(buyerId: string, dto: CreateOrderDTO) {
    const listing = await prisma.produceListing.findUnique({
      where: { id: dto.listingId },
      include: {
        farmer: {
          include: { farmerProfile: true }
        }
      }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.quantityAvailable < dto.quantity) {
      throw new Error(`Insufficient stock. Only ${listing.quantityAvailable} ${listing.unit} available.`);
    }

    const unitPrice = Number(listing.pricePerUnit);
    const totalAmount = unitPrice * dto.quantity;
    const orderId = this.generateOrderId();

    const order = await prisma.$transaction(async (tx) => {
      // 1. Decrement stock
      const updatedQty = listing.quantityAvailable - dto.quantity;
      await tx.produceListing.update({
        where: { id: listing.id },
        data: {
          quantityAvailable: updatedQty,
          status: updatedQty === 0 ? 'sold_out' : updatedQty < 10 ? 'low_stock' : 'available'
        }
      });

      // 2. Create Order
      const newOrder = await tx.order.create({
        data: {
          id: orderId,
          buyerId,
          farmerId: listing.farmerId,
          listingId: listing.id,
          quantity: dto.quantity,
          unit: listing.unit,
          unitPrice,
          totalAmount,
          deliveryState: dto.deliveryState,
          deliveryLga: dto.deliveryLga,
          deliveryAddress: dto.deliveryAddress,
          preferredDate: new Date(dto.preferredDate),
          buyerNote: dto.buyerNote,
          status: OrderStatus.PENDING,
          escrowFunded: false
        },
        include: {
          buyer: true,
          farmer: { include: { farmerProfile: true } },
          listing: true,
          negotiations: true
        }
      });

      // 3. Create Initial System Message
      await tx.message.create({
        data: {
          orderId: newOrder.id,
          senderId: 'system',
          text: `Order #${newOrder.id} created. All messages, counter-offers, and delivery updates are protected under RUUTED Escrow.`,
          isMasked: false,
          isRead: true
        }
      });

      // 4. Create Initial Buyer Message
      await tx.message.create({
        data: {
          orderId: newOrder.id,
          senderId: buyerId,
          text: `Hello! I have created Order #${newOrder.id} for ${dto.quantity} ${listing.unit} of ${listing.productName}. Please confirm harvest availability.`,
          isMasked: false,
          isRead: false
        }
      });

      return newOrder;
    });

    return this.formatOrder(order);
  }

  static async getOrders(user: JwtPayload, status?: string) {
    const where: any = {};

    if (user.role === 'buyer') {
      where.buyerId = user.id;
    } else if (user.role === 'farmer') {
      where.farmerId = user.id;
    }

    if (status && status !== 'All') {
      where.status = status as OrderStatus;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: true,
        farmer: { include: { farmerProfile: true } },
        listing: true,
        negotiations: { orderBy: { createdAt: 'desc' } }
      }
    });

    return orders.map(this.formatOrder);
  }

  static async getOrderById(orderId: string, user?: JwtPayload) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        farmer: { include: { farmerProfile: true } },
        listing: true,
        negotiations: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (user && user.role !== 'admin' && order.buyerId !== user.id && order.farmerId !== user.id) {
      throw new Error('Unauthorized access to this order');
    }

    return this.formatOrder(order);
  }

  static async updateStatus(
    orderId: string,
    farmerId: string,
    newStatus: OrderStatusType,
    rejectionReason?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: true }
    });

    if (!order) throw new Error('Order not found');
    if (order.farmerId !== farmerId) {
      throw new Error('Unauthorized: Only the fulfilling farmer can update this order status');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If rejected, restore quantity to listing
      if (newStatus === 'REJECTED' && order.status !== 'REJECTED') {
        await tx.produceListing.update({
          where: { id: order.listingId },
          data: {
            quantityAvailable: { increment: order.quantity },
            status: 'available'
          }
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus as OrderStatus,
          rejectionReason: newStatus === 'REJECTED' ? rejectionReason : undefined
        },
        include: {
          buyer: true,
          farmer: { include: { farmerProfile: true } },
          listing: true,
          negotiations: { orderBy: { createdAt: 'desc' } }
        }
      });

      // System notification message
      let msgText = `Order status updated to ${newStatus}.`;
      if (newStatus === 'ACCEPTED') {
        msgText = `Farmer accepted Order #${orderId}. Escrow holding authorized. Produce preparation in progress.`;
      } else if (newStatus === 'REJECTED') {
        msgText = `Farmer declined Order #${orderId}. Reason: ${rejectionReason || 'Produce unavailable'}. Any escrow deposits will be returned.`;
      } else if (newStatus === 'COMPLETED') {
        msgText = `Order #${orderId} marked COMPLETED! Farmer payout disbursement initiated.`;
      }

      await tx.message.create({
        data: {
          orderId,
          senderId: 'system',
          text: msgText,
          isMasked: false,
          isRead: false
        }
      });

      // If completed, trigger escrow disbursement to farmer
      if (newStatus === 'COMPLETED') {
        await disburseFarmerPayout({
          orderId,
          farmerId: order.farmerId,
          amount: Number(order.totalAmount)
        });
      }

      return updatedOrder;
    });

    return this.formatOrder(updated);
  }

  static async initializePayment(orderId: string, user: JwtPayload) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true }
    });

    if (!order) throw new Error('Order not found');
    if (order.buyerId !== user.id) {
      throw new Error('Only the buyer can initialize escrow payment');
    }

    return initializePaystackEscrowPayment({
      orderId: order.id,
      email: order.buyer.email,
      amountInNaira: Number(order.totalAmount)
    });
  }

  static async handlePaystackWebhook(body: any, rawBody: string, signature: string) {
    const isValid = verifyPaystackSignature(rawBody, signature);
    if (!isValid) {
      throw new Error('Invalid Paystack signature');
    }

    const event = body.event;
    if (event === 'charge.success') {
      const orderId = body.data?.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { escrowFunded: true }
        });

        await prisma.message.create({
          data: {
            orderId,
            senderId: 'system',
            text: 'Escrow payment confirmed! Funds are securely locked in RUUTED Escrow until order delivery inspection.',
            isMasked: false,
            isRead: false
          }
        });
      }
    }

    return { received: true };
  }
}
