import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir =
      process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName).toLowerCase();
    const sanitized = originalName
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
      .substring(0, 50);
    return `${sanitized}-${timestamp}-${random}${extension}`;
  }

  async saveFile(
    file: Express.Multer.File,
    tenantId: string,
    userId: string,
  ) {
    this.validateFile(file);

    const filename = this.generateUniqueFilename(file.originalname);
    const tenantDir = path.join(this.uploadDir, tenantId);

    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const filePath = path.join(tenantDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const relativePath = path.join(tenantId, filename).replace(/\\/g, '/');
    const fileUrl = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${relativePath}`;

    this.logger.log(`File uploaded: ${filename} by user ${userId}`);

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: fileUrl,
      relativePath,
    };
  }

  async saveFiles(
    files: Express.Multer.File[],
    tenantId: string,
    userId: string,
  ) {
    const results: Record<string, unknown>[] = [];
    const errors: Record<string, unknown>[] = [];

    for (const file of files) {
      try {
        const result = await this.saveFile(file, tenantId, userId);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: (error as Error).message,
        });
      }
    }

    return {
      uploaded: results,
      failed: errors,
      total: files.length,
      success: results.length,
      failedCount: errors.length,
    };
  }

  async removeFile(filename: string, tenantId: string) {
    const filePath = path.join(this.uploadDir, tenantId, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      throw new BadRequestException('Cannot delete directories');
    }

    fs.unlinkSync(filePath);
    this.logger.log(`File deleted: ${filename} from tenant ${tenantId}`);

    return {
      message: 'File deleted successfully',
      filename,
      deletedAt: new Date().toISOString(),
    };
  }

  getFilePath(tenantId: string, filename: string): string {
    const filePath = path.join(this.uploadDir, tenantId, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return filePath;
  }
}