import { Request, Response, NextFunction } from 'express';
import { processUploadedFile } from '../integrations/storage.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class UploadController {
  static async uploadSingle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No image file uploaded', 400);
      }

      const host = req.get('host') || 'localhost:5000';
      const fileUrl = await processUploadedFile(req.file, host);

      return sendSuccess(
        res,
        {
          url: fileUrl,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size
        },
        'Image uploaded successfully',
        201
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return sendError(res, 'No image files uploaded', 400);
      }

      const host = req.get('host') || 'localhost:5000';
      const urls = await Promise.all(files.map((file) => processUploadedFile(file, host)));

      return sendSuccess(
        res,
        {
          urls,
          count: urls.length
        },
        'Images uploaded successfully',
        201
      );
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}
