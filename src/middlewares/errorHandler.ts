import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Global Error Handler]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  sendError(res, message, statusCode);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Endpoint ${req.method} ${req.originalUrl} not found`, 404);
}
