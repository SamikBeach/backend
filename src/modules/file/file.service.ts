import { Injectable, BadRequestException } from '@nestjs/common';
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
      const signature = buffer.toString('hex', 4, 12).toLowerCase();
      const isHeic =
        signature.includes('66747970686569') || // ftyp + heic
        signature.includes('66747970686569') || // ftyp + heif
        signature.includes('667479706d696631'); // ftyp + mif1

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
      throw new BadRequestException('HEIC 이미지 변환에 실패했습니다.');
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
      throw new BadRequestException('이미지 최적화에 실패했습니다.');
    }
  }

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<string> {
    if (!file.buffer) {
      throw new BadRequestException('파일 데이터가 없습니다.');
    }

    try {
      let processedBuffer = file.buffer;
      processedBuffer = await this.convertHeicToJpeg(processedBuffer);
      processedBuffer = await this.optimizeImage(processedBuffer);

      const uploadPath = path.join(this.uploadDir, this.profileDir);
      await fs.mkdir(uploadPath, { recursive: true });

      const fileName = `${userId}-${Date.now()}.jpg`;
      const relativePath = path.join(this.profileDir, fileName);
      const absolutePath = path.join(this.uploadDir, relativePath);

      await fs.writeFile(absolutePath, processedBuffer);

      const baseUrl =
        this.configService.get('BASE_URL') || 'http://localhost:3000';
      return `${baseUrl}/api/v2/uploads/${relativePath}`;
    } catch (error) {
      throw new BadRequestException(
        `파일 업로드에 실패했습니다: ${error.message}`,
      );
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
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
