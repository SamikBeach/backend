import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import * as heicConvert from 'heic-convert';
import * as sharp from 'sharp';

@Injectable()
export class FileService {
  private readonly uploadDir = 'uploads';
  private readonly profileDir = 'profiles';

  constructor(private readonly configService: ConfigService) {}

  private async convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
    try {
      // HEIC 파일인지 확인 (파일 시그니처 체크)
      const isHeic = buffer.toString('hex', 8, 12).toLowerCase() === '68656963';

      if (!isHeic) {
        return buffer;
      }

      const jpegBuffer = await heicConvert({
        buffer,
        format: 'JPEG',
        quality: 0.9,
      });

      return Buffer.from(jpegBuffer);
    } catch (error) {
      console.error('HEIC 변환 실패:', error);
      return buffer;
    }
  }

  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      console.error('이미지 최적화 실패:', error);
      return buffer;
    }
  }

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<string> {
    let processedBuffer = file.buffer;

    // HEIC 이미지 변환 시도
    processedBuffer = await this.convertHeicToJpeg(processedBuffer);

    // 이미지 최적화
    processedBuffer = await this.optimizeImage(processedBuffer);

    const fileName = `${userId}-${Date.now()}.jpg`;
    const relativePath = path.join(this.profileDir, fileName);
    const absolutePath = path.join(this.uploadDir, relativePath);

    await fs.writeFile(absolutePath, processedBuffer);

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
