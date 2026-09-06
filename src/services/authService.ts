import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { RegisterDTO, LoginDTO, JwtPayload, UserRole } from '../types/index.js';

export class AuthService {
  private static signToken(payload: JwtPayload): string {
    const secret = config.jwt.secret || 'ruuted-development-jwt-fallback-secret-2026';
    return jwt.sign(payload, secret, { expiresIn: config.jwt.expiresIn as any });
  }

  static async register(dto: RegisterDTO) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      throw new Error('User with this email already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Create user in transaction with farmer profile if role === 'farmer'
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: normalizedEmail,
          passwordHash,
          phoneNumber: dto.phoneNumber,
          role: dto.role,
          state: dto.state,
          lga: dto.lga,
          profilePicture:
            dto.role === 'farmer'
              ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        }
      });

      let farmerProfile = null;
      if (dto.role === 'farmer') {
        farmerProfile = await tx.farmerProfile.create({
          data: {
            userId: user.id,
            farmName: dto.farmName || `${dto.name} Agro Enterprise`,
            farmLocation: dto.farmLocation || `${dto.lga}, ${dto.state}`,
            description: dto.description || 'Verified local agricultural producer specializing in premium harvests.',
            rating: 5.0,
            isVerified: true
          }
        });
      }

      return { user, farmerProfile };
    });

    const jwtPayload: JwtPayload = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role as UserRole,
      name: result.user.name
    };

    const token = this.signToken(jwtPayload);

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
        role: result.user.role,
        state: result.user.state,
        lga: result.user.lga,
        profilePicture: result.user.profilePicture,
        createdAt: result.user.createdAt,
        farmerProfile: result.farmerProfile
      },
      token
    };
  }

  static async login(dto: LoginDTO) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { farmerProfile: true }
    });

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const jwtPayload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      name: user.name
    };

    const token = this.signToken(jwtPayload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        state: user.state,
        lga: user.lga,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        farmerProfile: user.farmerProfile
      },
      token
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmerProfile: true,
        _count: {
          select: {
            listings: true,
            buyerOrders: true,
            farmerOrders: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      state: user.state,
      lga: user.lga,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      farmerProfile: user.farmerProfile
        ? {
            ...user.farmerProfile,
            activeListingsCount: user._count.listings,
            completedOrdersCount: user._count.farmerOrders
          }
        : undefined
    };
  }
}
