import { Router } from 'express';
import authRoutes from './authRoutes.js';
import listingRoutes from './listingRoutes.js';
import orderRoutes from './orderRoutes.js';
import pestRoutes from './pestRoutes.js';
import knowledgeRoutes from './knowledgeRoutes.js';
import uploadRoutes from './uploadRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'RUUTED Agricultural Platform Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/orders', orderRoutes);
router.use('/pest', pestRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/upload', uploadRoutes);

export default router;
