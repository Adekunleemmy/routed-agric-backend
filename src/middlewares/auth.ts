import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { sendError } from '../utils/response.js';
import { JwtPayload, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication required. No token provided.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Invalid token format.', 401);
      return;
    }

    const secret = config.jwt.secret || 'ruuted-development-jwt-fallback-secret-2026';
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (err: any) {
      sendError(res, 'Invalid or expired token.', 401);
      return;
    }

    // Attach to request
    req.user = decoded;
    next();
  } catch (error: any) {
    sendError(res, 'Authentication failure.', 500, error.message);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access forbidden: Requires role ${allowedRoles.join(' or ')}. Your role is '${req.user.role}'.`,
        403
      );
      return;
    }

    next();
  };
}
