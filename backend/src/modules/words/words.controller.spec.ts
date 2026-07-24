import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { WordsController } from './words.controller';

describe('WordsController', () => {
  let controller: WordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // `check` now carries @UseGuards(..., ThrottlerGuard) (rate-limits the
      // direct Gemini call) — ThrottlerGuard needs THROTTLER:MODULE_OPTIONS/
      // ThrottlerStorage from ThrottlerModule to be instantiable, same as the
      // real app.module.ts registration.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
      controllers: [WordsController],
    }).compile();

    controller = module.get<WordsController>(WordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
