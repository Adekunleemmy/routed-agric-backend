import { Request, Response, NextFunction } from 'express';
import { ListingService } from '../services/listingService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { z } from 'zod';

export const createListingSchema = z.object({
  productName: z.string().min(2, 'Product name is required'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  quantityAvailable: z.number().int().min(0, 'Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required'),
  pricePerUnit: z.number().positive('Price must be positive'),
  state: z.string().min(2, 'State is required'),
  lga: z.string().min(2, 'LGA is required'),
  harvestDate: z.string().min(4, 'Harvest date is required'),
  images: z.array(z.string()).default([])
});

export const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(['available', 'low_stock', 'sold_out']).optional()
});

export class ListingController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { listings, meta } = await ListingService.getAll(req.query);
      return sendSuccess(res, listings, 'Listings retrieved successfully', 200, meta);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const listing = await ListingService.getById(id);
      return sendSuccess(res, listing, 'Listing retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const listing = await ListingService.create(req.user.id, req.body);
      return sendSuccess(res, listing, 'Listing created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      const listing = await ListingService.update(id, req.user.id, req.body);
      return sendSuccess(res, listing, 'Listing updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const id = String(req.params.id);
      await ListingService.delete(id, req.user.id);
      return sendSuccess(res, { deleted: true }, 'Listing deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
