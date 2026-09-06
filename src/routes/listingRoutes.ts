import { Router } from 'express';
import {
  ListingController,
  createListingSchema,
  updateListingSchema
} from '../controllers/listingController.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validator.js';

const router = Router();

router.get('/', ListingController.getAll);
router.get('/:id', ListingController.getById);

// Farmer only operations
router.post(
  '/',
  authenticate,
  requireRole('farmer', 'admin'),
  validateBody(createListingSchema),
  ListingController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('farmer', 'admin'),
  validateBody(updateListingSchema),
  ListingController.update
);

router.delete(
  '/:id',
  authenticate,
  requireRole('farmer', 'admin'),
  ListingController.delete
);

export default router;
