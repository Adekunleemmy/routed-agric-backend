import { prisma } from '../config/prisma.js';
import { CreateListingDTO, UpdateListingDTO } from '../types/index.js';
import { ProduceStatus } from '@prisma/client';

export interface ListingFilterQuery {
  category?: string;
  state?: string;
  lga?: string;
  search?: string;
  farmerId?: string;
  status?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export class ListingService {
  static async getAll(query: ListingFilterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.category && query.category !== 'All') {
      where.category = query.category;
    }

    if (query.state && query.state !== 'All') {
      where.state = { equals: query.state, mode: 'insensitive' };
    }

    if (query.lga && query.lga !== 'All') {
      where.lga = { equals: query.lga, mode: 'insensitive' };
    }

    if (query.farmerId) {
      where.farmerId = query.farmerId;
    }

    if (query.status && query.status !== 'All') {
      where.status = query.status as ProduceStatus;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { productName: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
        { lga: { contains: term, mode: 'insensitive' } }
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'price_asc') {
      orderBy = { pricePerUnit: 'asc' };
    } else if (query.sortBy === 'price_desc') {
      orderBy = { pricePerUnit: 'desc' };
    } else if (query.sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const [total, listings] = await Promise.all([
      prisma.produceListing.count({ where }),
      prisma.produceListing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          farmer: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              state: true,
              lga: true,
              farmerProfile: true
            }
          }
        }
      })
    ]);

    const formatted = listings.map((l) => ({
      id: l.id,
      farmerId: l.farmerId,
      farmerName: l.farmer.name,
      farmerPhone: l.farmer.phoneNumber,
      farmName: l.farmer.farmerProfile?.farmName || `${l.farmer.name} Farm`,
      farmerRating: l.farmer.farmerProfile ? Number(l.farmer.farmerProfile.rating) : 5.0,
      isFarmerVerified: l.farmer.farmerProfile?.isVerified || false,
      productName: l.productName,
      category: l.category,
      description: l.description,
      quantityAvailable: l.quantityAvailable,
      unit: l.unit,
      pricePerUnit: Number(l.pricePerUnit),
      state: l.state,
      lga: l.lga,
      harvestDate: l.harvestDate.toISOString().split('T')[0],
      images: l.images,
      status: l.status,
      createdAt: l.createdAt.toISOString()
    }));

    return {
      listings: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getById(id: string) {
    const listing = await prisma.produceListing.findUnique({
      where: { id },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            state: true,
            lga: true,
            farmerProfile: true,
            _count: {
              select: {
                farmerOrders: true,
                listings: true
              }
            }
          }
        }
      }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    return {
      id: listing.id,
      farmerId: listing.farmerId,
      farmerName: listing.farmer.name,
      farmerPhone: listing.farmer.phoneNumber,
      farmName: listing.farmer.farmerProfile?.farmName || `${listing.farmer.name} Farm`,
      farmLocation: listing.farmer.farmerProfile?.farmLocation || `${listing.farmer.lga}, ${listing.farmer.state}`,
      farmerRating: listing.farmer.farmerProfile ? Number(listing.farmer.farmerProfile.rating) : 5.0,
      isFarmerVerified: listing.farmer.farmerProfile?.isVerified || false,
      completedOrdersCount: listing.farmer._count.farmerOrders,
      activeListingsCount: listing.farmer._count.listings,
      productName: listing.productName,
      category: listing.category,
      description: listing.description,
      quantityAvailable: listing.quantityAvailable,
      unit: listing.unit,
      pricePerUnit: Number(listing.pricePerUnit),
      state: listing.state,
      lga: listing.lga,
      harvestDate: listing.harvestDate.toISOString().split('T')[0],
      images: listing.images,
      status: listing.status,
      createdAt: listing.createdAt.toISOString()
    };
  }

  static async create(farmerId: string, dto: CreateListingDTO) {
    const listing = await prisma.produceListing.create({
      data: {
        farmerId,
        productName: dto.productName,
        category: dto.category,
        description: dto.description,
        quantityAvailable: dto.quantityAvailable,
        unit: dto.unit,
        pricePerUnit: dto.pricePerUnit,
        state: dto.state,
        lga: dto.lga,
        harvestDate: new Date(dto.harvestDate),
        images: dto.images && dto.images.length > 0 ? dto.images : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'],
        status: dto.quantityAvailable > 0 ? 'available' : 'sold_out'
      }
    });

    return this.getById(listing.id);
  }

  static async update(id: string, farmerId: string, dto: UpdateListingDTO) {
    const listing = await prisma.produceListing.findUnique({ where: { id } });
    if (!listing) throw new Error('Listing not found');
    if (listing.farmerId !== farmerId) {
      throw new Error('Unauthorized: You can only edit your own listings');
    }

    const data: any = {};
    if (dto.productName !== undefined) data.productName = dto.productName;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.quantityAvailable !== undefined) {
      data.quantityAvailable = dto.quantityAvailable;
      if (dto.quantityAvailable === 0) data.status = 'sold_out';
      else if (dto.quantityAvailable < 10) data.status = 'low_stock';
      else data.status = 'available';
    }
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.pricePerUnit !== undefined) data.pricePerUnit = dto.pricePerUnit;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.lga !== undefined) data.lga = dto.lga;
    if (dto.harvestDate !== undefined) data.harvestDate = new Date(dto.harvestDate);
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.status !== undefined) data.status = dto.status;

    await prisma.produceListing.update({
      where: { id },
      data
    });

    return this.getById(id);
  }

  static async delete(id: string, farmerId: string) {
    const listing = await prisma.produceListing.findUnique({ where: { id } });
    if (!listing) throw new Error('Listing not found');
    if (listing.farmerId !== farmerId) {
      throw new Error('Unauthorized: You can only delete your own listings');
    }

    await prisma.produceListing.delete({ where: { id } });
    return true;
  }
}
