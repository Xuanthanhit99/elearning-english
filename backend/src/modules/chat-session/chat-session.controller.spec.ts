import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { ChatSessionController } from './chat-session.controller';

describe('ChatSessionController', () => {
  let controller: ChatSessionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // `message` now carries @UseGuards(..., ThrottlerGuard) (rate-limits the
      // direct Gemini call) — ThrottlerGuard needs THROTTLER:MODULE_OPTIONS/
      // ThrottlerStorage from ThrottlerModule to be instantiable, same as the
      // real app.module.ts registration.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
      controllers: [ChatSessionController],
    }).compile();

    controller = module.get<ChatSessionController>(ChatSessionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
