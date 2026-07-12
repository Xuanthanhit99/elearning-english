import { Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

type AdvisoryLockResult = {
  locked: boolean;
};

@Injectable()
export class QuestionGenerationLockService {
  private readonly logger = new Logger(QuestionGenerationLockService.name);

  private readonly retryDelayMs = 1500;
  private readonly maxAttempts = 5;

  constructor(private readonly prisma: PrismaService) {}

  async withLock<T>(key: string, callback: () => Promise<T>): Promise<T> {
    const [lockKey1, lockKey2] = this.createLockIds(key);

    /*
     * Interactive transaction giúp tất cả câu lệnh lock/unlock
     * chạy trên cùng một PostgreSQL connection.
     *
     * Callback có thể gọi Gemini/TTS nên cần tăng timeout.
     */
    return this.prisma.$transaction(
      async (tx) => {
        let locked = false;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
          const result = await tx.$queryRaw<AdvisoryLockResult[]>`
            SELECT pg_try_advisory_lock(
              ${lockKey1}::int,
              ${lockKey2}::int
            ) AS locked
          `;

          locked = result[0]?.locked === true;

          if (locked) {
            this.logger.debug(`Acquired question-generation lock: ${key}`);

            break;
          }

          if (attempt < this.maxAttempts) {
            this.logger.warn(
              `Lock ${key} đang được giữ. Retry ${attempt}/${this.maxAttempts}`,
            );

            await this.sleep(this.retryDelayMs);
          }
        }

        if (!locked) {
          throw new RequestTimeoutException(
            'Hệ thống đang chuẩn bị ngân hàng câu hỏi. Vui lòng thử lại sau ít giây.',
          );
        }

        try {
          return await callback();
        } finally {
          try {
            const unlockResult = await tx.$queryRaw<
              Array<{ unlocked: boolean }>
            >`
              SELECT pg_advisory_unlock(
                ${lockKey1}::int,
                ${lockKey2}::int
              ) AS unlocked
            `;

            if (unlockResult[0]?.unlocked !== true) {
              this.logger.warn(
                `Không thể release question-generation lock: ${key}`,
              );
            } else {
              this.logger.debug(`Released question-generation lock: ${key}`);
            }
          } catch (error) {
            this.logger.error(
              `Release lock ${key} failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      },
      {
        /*
         * Chờ tối đa 10 giây để Prisma lấy connection.
         */
        maxWait: 10_000,

        /*
         * Gemini retry + TTS có thể lâu.
         * Điều chỉnh lên 180 giây nếu hệ thống thường xuyên gọi AI nhiều lần.
         */
        timeout: 120_000,
      },
    );
  }

  /**
   * PostgreSQL hỗ trợ:
   *
   * pg_try_advisory_lock(int, int)
   *
   * Hai số này đều nằm trong phạm vi signed int32:
   * -2,147,483,648 đến 2,147,483,647.
   */
  private createLockIds(key: string): [number, number] {
    const hash = createHash('sha256').update(key).digest();

    return [hash.readInt32BE(0), hash.readInt32BE(4)];
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
