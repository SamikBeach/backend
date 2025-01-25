import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileService {
  private readonly uploadDir = 'uploads';
  private readonly profileDir = 'profiles';

  constructor(private readonly configService: ConfigService) {}

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<string> {
    const fileName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    const relativePath = path.join(this.profileDir, fileName);
    const absolutePath = path.join(this.uploadDir, relativePath);

    await fs.writeFile(absolutePath, file.buffer);

    // 전체 URL 반환
    const baseUrl =
      this.configService.get('BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/api/v2/uploads/${relativePath}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // URL에서 파일 경로 추출
      const baseUrl =
        this.configService.get('BASE_URL') || 'http://localhost:3001';
      const urlPath = fileUrl.replace(`${baseUrl}/api/v2/uploads/`, '');
      const filePath = path.join(this.uploadDir, urlPath);

      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
