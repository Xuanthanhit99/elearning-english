import { Provider } from '@nestjs/common';
import { createRedisClient } from '../../config/redis.config';

/*
 * Stage 6D.3: kết nối Redis riêng cho Listening, dùng cho cold-start
 * fallback lock (SET NX EX) — thay cho Map in-memory cũ (6D.1/6D.2)
 * vốn chỉ an toàn single-instance. Dùng cấu hình REDIS_HOST/PORT/
 * PASSWORD giống các module khác (vd LeaderboardModule) thay vì import
 * cả LeaderboardModule (tránh kéo theo controller/gateway không liên
 * quan tới Listening).
 */
export const LISTENING_REDIS = Symbol('LISTENING_REDIS');

export const ListeningRedisProvider: Provider = {
  provide: LISTENING_REDIS,
  useFactory: () =>
    createRedisClient({
      maxRetriesPerRequest: null,
    }),
};
