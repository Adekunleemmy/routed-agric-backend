import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { initSocketServer } from './websocket/orderSocket.js';
import { prisma } from './config/prisma.js';

async function bootstrap() {
  try {
    // Verify database connectivity
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL successfully.');

    const app = createApp();
    const server = http.createServer(app);

    // Initialize WebSockets
    initSocketServer(server);
    console.log('[WebSockets] Socket.io server initialized.');

    server.listen(config.port, () => {
      console.log('====================================================');
      console.log(`🌾 RUUTED Agricultural Platform Backend Running`);
      console.log(`🚀 Server Address: http://localhost:${config.port}`);
      console.log(`📚 API Docs:       http://localhost:${config.port}/api/docs`);
      console.log(`📡 WebSocket:      ws://localhost:${config.port}`);
      console.log(`🔗 API Base:       http://localhost:${config.port}${config.apiPrefix}`);
      console.log('====================================================');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('[Server] Closed connections. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Bootstrap Error] Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
