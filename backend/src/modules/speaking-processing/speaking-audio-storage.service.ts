import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';

@Injectable()
export class SpeakingAudioStorageService {
  async save(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File audio rỗng.');
    }

    const allowed = new Set([
      'audio/webm',
      'audio/wav',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
    ]);

    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(
        `Định dạng audio không được hỗ trợ: ${file.mimetype}`,
      );
    }

    const extension =
      extname(file.originalname) ||
      this.extensionFromMime(file.mimetype);

    const hash = createHash('sha256')
      .update(file.buffer)
      .digest('hex')
      .slice(0, 32);

    const filename = `${hash}${extension}`;
    const directory = join(
      process.cwd(),
      'public',
      'speaking-audio',
    );
    const filepath = join(directory, filename);

    await fs.mkdir(directory, {
      recursive: true,
    });

    try {
      await fs.access(filepath);
    } catch {
      await fs.writeFile(filepath, file.buffer);
    }

    const baseUrl = (
      process.env.BACKEND_PUBLIC_URL ??
      'http://localhost:3002'
    ).replace(/\/$/, '');

    return {
      filepath,
      audioUrl: `${baseUrl}/speaking-audio/${filename}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private extensionFromMime(mimeType: string) {
    const map: Record<string, string> = {
      'audio/webm': '.webm',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/ogg': '.ogg',
    };

    return map[mimeType] ?? '.webm';
  }
}
