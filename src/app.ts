import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import apiRoutes from './routes/index.js';
import { swaggerDocument } from './docs/swagger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export function createApp(): express.Application {
  const app = express();

  // Security headers (allowing cross-origin images for preview)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: '*', // Allow connections from frontend and local clients
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature']
    })
  );

  // Request logger
  if (config.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // JSON & URL-encoded parsers with raw body preservation for webhooks
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      }
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Static directory for uploaded files
  app.use('/uploads', express.static(config.uploads.dir));

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Root redirect/landing
  app.get('/', (_req, res) => {
    res.json({
      platform: 'RUUTED Agricultural Platform - Production Backend',
      version: '1.0.0',
      status: 'active',
      documentation: '/api/docs',
      apiPrefix: config.apiPrefix
    });
  });

  // Mount API endpoints
  app.use(config.apiPrefix, apiRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
