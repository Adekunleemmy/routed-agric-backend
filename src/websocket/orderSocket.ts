import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/index.js';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join specific order room for chat and negotiations
    socket.on('join_order_room', (orderId: string) => {
      if (orderId) {
        const room = `order_${orderId}`;
        socket.join(room);
        console.log(`[WebSocket] Client ${socket.id} joined room ${room}`);
        socket.emit('joined_room', { orderId, room, status: 'ok' });
      }
    });

    socket.on('leave_order_room', (orderId: string) => {
      if (orderId) {
        const room = `order_${orderId}`;
        socket.leave(room);
        console.log(`[WebSocket] Client ${socket.id} left room ${room}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}
