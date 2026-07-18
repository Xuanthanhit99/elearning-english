import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { mkdir, access, writeFile } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

@Injectable()
export class PlacementTtsService {
  private readonly logger = new Logger(PlacementTtsService.name);

  private readonly client = new TextToSpeechClient();

  async createAudioFromScript(
    script: string,
    cacheKey?: string,
  ): Promise<string> {
    const normalizedScript = script.trim();

    if (!normalizedScript) {
      throw new InternalServerErrorException(
        'Nội dung Text-to-Speech không được để trống.',
      );
    }

    const filename = this.createFilename(normalizedScript, cacheKey);

    const relativePath = `/uploads/placement-audio/${filename}`;

    const directory = join(process.cwd(), 'uploads', 'placement-audio');

    const absolutePath = join(directory, filename);

    await mkdir(directory, {
      recursive: true,
    });

    /*
     * Nếu file đã tồn tại thì không gọi Google TTS lại.
     */
    if (await this.fileExists(absolutePath)) {
      return relativePath;
    }

    const audioBuffer = await this.callGoogleTextToSpeech(normalizedScript);

    await writeFile(absolutePath, audioBuffer);

    return relativePath;
  }

  private async callGoogleTextToSpeech(text: string): Promise<Buffer> {
    try {
      const [response] = await this.client.synthesizeSpeech({
        input: {
          text,
        },
        voice: {
          languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE ?? 'en-US',
          name: process.env.GOOGLE_TTS_VOICE_NAME ?? 'en-US-Neural2-F',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? 0.9),
          pitch: Number(process.env.GOOGLE_TTS_PITCH ?? 0),
        },
      });

      if (!response.audioContent) {
        throw new Error('Google Text-to-Speech không trả về audioContent.');
      }

      return Buffer.isBuffer(response.audioContent)
        ? response.audioContent
        : Buffer.from(response.audioContent);
    } catch (error) {
      this.logger.error(
        'Google Text-to-Speech failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        'Không thể tạo audio bằng Google Text-to-Speech.',
      );
    }
  }

  private createFilename(script: string, cacheKey?: string): string {
    const hash = createHash('sha256')
      .update(cacheKey ?? script)
      .digest('hex');

    return `${hash}.mp3`;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
