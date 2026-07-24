import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { WritingController } from './writing.controller';
import { WritingHistoryService } from './writing-history.service';
import { WritingProcessingService } from './writing-processing.service';
import { WritingService } from './writing.service';

describe('WritingController', () => {
  let controller: WritingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // `check` now carries @UseGuards(..., ThrottlerGuard) (rate-limits the
      // direct Gemini call) — ThrottlerGuard needs THROTTLER:MODULE_OPTIONS/
      // ThrottlerStorage from ThrottlerModule to be instantiable, same as the
      // real app.module.ts registration.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
      controllers: [WritingController],
      providers: [
        {
          provide: WritingService,
          useValue: {},
        },
        {
          provide: WritingProcessingService,
          useValue: {},
        },
        {
          provide: WritingHistoryService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<WritingController>(WritingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
