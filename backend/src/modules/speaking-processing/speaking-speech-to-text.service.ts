import {
  Injectable,
  Logger,
} from '@nestjs/common';
import speech from '@google-cloud/speech';
import { promises as fs } from 'fs';

@Injectable()
export class SpeakingSpeechToTextService {
  private readonly logger = new Logger(
    SpeakingSpeechToTextService.name,
  );

  private readonly client =
    new speech.SpeechClient();

  async transcribe(input: {
    filepath: string;
    mimeType: string;
    languageCode?: string;
  }) {
    const content = await fs.readFile(
      input.filepath,
    );

    const encoding = this.resolveEncoding(
      input.mimeType,
    );

    try {
      const [response] =
        await this.client.recognize({
          audio: {
            content:
              content.toString('base64'),
          },
          config: {
            languageCode:
              input.languageCode ??
              process.env
                .SPEAKING_STT_LANGUAGE ??
              'en-US',
            encoding,
            enableAutomaticPunctuation: true,
            model:
              process.env
                .SPEAKING_STT_MODEL ??
              'latest_long',
          },
        });

      const transcript = (
        response.results ?? []
      )
        .map(
          (result) =>
            result.alternatives?.[0]
              ?.transcript ?? '',
        )
        .join(' ')
        .trim();

      const confidenceValues = (
        response.results ?? []
      )
        .map(
          (result) =>
            result.alternatives?.[0]
              ?.confidence,
        )
        .filter(
          (value): value is number =>
            typeof value === 'number',
        );

      const confidence =
        confidenceValues.length > 0
          ? confidenceValues.reduce(
              (sum, value) => sum + value,
              0,
            ) / confidenceValues.length
          : 0;

      return {
        transcript,
        confidence: Math.round(
          confidence * 100,
        ),
      };
    } catch (error) {
      this.logger.error(
        'Google Speech-to-Text failed',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }
  }

  private resolveEncoding(
    mimeType: string,
  ):
    | 'WEBM_OPUS'
    | 'LINEAR16'
    | 'MP3'
    | 'OGG_OPUS'
    | 'ENCODING_UNSPECIFIED' {
    if (mimeType.includes('webm')) {
      return 'WEBM_OPUS';
    }

    if (mimeType.includes('wav')) {
      return 'LINEAR16';
    }

    if (mimeType.includes('mpeg')) {
      return 'MP3';
    }

    if (mimeType.includes('ogg')) {
      return 'OGG_OPUS';
    }

    return 'ENCODING_UNSPECIFIED';
  }
}
