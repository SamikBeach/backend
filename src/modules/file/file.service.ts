import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly uploadDir = 'uploads';
  private readonly profileDir = 'profiles';

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<string> {
    const fileName = `${userId}-${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(this.uploadDir, this.profileDir, fileName);

    await fs.writeFile(filePath, file.buffer);
    return filePath;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // Ignore if file doesn't exist
        throw error;
      }
    }
  }
}
