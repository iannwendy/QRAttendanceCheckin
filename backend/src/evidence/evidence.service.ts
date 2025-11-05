import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvidenceService {
  constructor(private configService: ConfigService) {}

  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    // Trong môi trường dev, trả về URL tĩnh
    // File đã được lưu bởi multer
    const filename = file.filename;
    return `/uploads/${filename}`;
  }
}

