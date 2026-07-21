// src/modules/tts/tts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import textToSpeech from '@google-cloud/text-to-speech';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  getTtsAudioDir,
  getTtsAudioUrlPrefix,
} from '../../config/static-assets.config';

export type TtsLang = 'en' | 'vi';

/**
 * Service TTS dùng chung cho mọi nơi cần đọc phát âm (từ vựng, câu luyện
 * phát âm, từ trong bài đọc/ngữ pháp...). Dùng lại đúng cơ chế cache
 * sha256-của-text như `ListeningTtsService`/`PlacementTtsService`, ghi
 * vào 1 thư mục riêng (`getTtsAudioDir()`) để không đụng vào cache audio
 * của 2 service kia.
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly client = new textToSpeech.TextToSpeechClient();

  async synthesize(text: string, lang: TtsLang = 'en'): Promise<string | null> {
    const normalized = text.trim();

    if (!normalized) {
      return null;
    }

    const hash = createHash('sha256')
      .update(`${lang}:${normalized}`)
      .digest('hex')
      .slice(0, 24);

    const directory = getTtsAudioDir();
    const filename = `${hash}.mp3`;
    const filepath = join(directory, filename);
    const backendPublicUrl =
      process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3002';
    const publicUrl = `${backendPublicUrl}${getTtsAudioUrlPrefix()}/${filename}`;

    try {
      await fs.mkdir(directory, { recursive: true });

      try {
        await fs.access(filepath);
        return publicUrl;
      } catch {
        // File chưa tồn tại, cần tổng hợp mới.
      }

      const { languageCode, voiceName } = this.resolveVoice(lang);

      const [response] = await this.client.synthesizeSpeech({
        input: { text: normalized },
        voice: { languageCode, name: voiceName },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Number(process.env.TTS_SPEAKING_RATE ?? 0.95),
        },
      });

      if (!response.audioContent) {
        return null;
      }

      await fs.writeFile(filepath, response.audioContent as Uint8Array);

      return publicUrl;
    } catch (error) {
      this.logger.error(
        'Không tạo được audio TTS',
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  private resolveVoice(lang: TtsLang): { languageCode: string; voiceName: string } {
    if (lang === 'vi') {
      return {
        languageCode: process.env.TTS_VI_LANGUAGE ?? 'vi-VN',
        voiceName: process.env.TTS_VI_VOICE ?? 'vi-VN-Wavenet-A',
      };
    }

    return {
      languageCode: process.env.TTS_EN_LANGUAGE ?? 'en-US',
      voiceName: process.env.TTS_EN_VOICE ?? 'en-US-Neural2-F',
    };
  }
}
