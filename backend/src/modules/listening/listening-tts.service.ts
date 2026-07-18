import { Injectable, Logger } from '@nestjs/common';
import textToSpeech from '@google-cloud/text-to-speech';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  getListeningAudioDir,
  getListeningAudioUrlPrefix,
} from '../../config/static-assets.config';

@Injectable()
export class ListeningTtsService {
  private readonly logger = new Logger(ListeningTtsService.name);
  private readonly client = new textToSpeech.TextToSpeechClient();

  async createAudioFromTranscript(transcript: string): Promise<string | null> {
    const normalized = transcript.trim();

    if (!normalized) {
      return null;
    }

    const hash = createHash('sha256')
      .update(normalized)
      .digest('hex')
      .slice(0, 24);

    /*
     * Stage 6D.3: SỬA LỖI HIGH từ 6D.1/6D.2 — trước đây thư mục ghi
     * audio đọc từ env `LISTENING_AUDIO_STORAGE_DIR` (đường dẫn tuyệt
     * đối tự do) hoàn toàn tách biệt với `ServeStaticModule.forRoot()`
     * (app.module.ts, lúc đó hard-code `public/`), nên đổi env kia
     * không làm URL trả về đúng nữa (404 dù file tồn tại). Giờ cả 2
     * phía dùng chung `static-assets.config.ts`:
     *   - `getStaticRootDir()`  -> ServeStaticModule.forRoot() (app.module.ts)
     *   - `getListeningAudioDir()` = staticRoot + subdir -> nơi ghi file ở đây
     *   - `getListeningAudioUrlPrefix()` = "/" + subdir -> URL trả về
     * Ghi/serve/URL luôn nhất quán theo đúng 1 cặp env
     * `STATIC_ROOT_DIR` + `LISTENING_AUDIO_SUBDIR` (subdir, KHÔNG phải
     * absolute path, nên không thể tự thoát ra ngoài static root nữa).
     * Mặc định không đổi hành vi cũ nếu không set env.
     */
    const directory = getListeningAudioDir();

    const filename = `${hash}.mp3`;
    const filepath = join(directory, filename);
    const backendPublicUrl =
      process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3002';

    const publicUrl = `${backendPublicUrl}${getListeningAudioUrlPrefix()}/${filename}`;

    try {
      await fs.mkdir(directory, {
        recursive: true,
      });

      try {
        await fs.access(filepath);
        return publicUrl;
      } catch {
        // File chưa tồn tại.
      }

      const [response] = await this.client.synthesizeSpeech({
        input: {
          text: normalized,
        },
        voice: {
          languageCode: process.env.LISTENING_TTS_LANGUAGE ?? 'en-US',
          name: process.env.LISTENING_TTS_VOICE ?? 'en-US-Neural2-F',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Number(process.env.LISTENING_TTS_RATE ?? 0.95),
        },
      });

      if (!response.audioContent) {
        return null;
      }

      await fs.writeFile(filepath, response.audioContent as Uint8Array);

      return publicUrl;
    } catch (error) {
      this.logger.error(
        'Không tạo được audio Listening',
        error instanceof Error ? error.stack : String(error),
      );

      /*
       * Không chặn việc tạo question nếu TTS lỗi.
       * Question vẫn có transcript để retry TTS sau.
       */
      return null;
    }
  }
}
