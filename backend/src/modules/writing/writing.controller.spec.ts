import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { WritingController } from './writing.controller';
import { WritingHistoryService } from './writing-history.service';
import { WritingProcessingService } from './writing-processing.service';
import { WritingService } from './writing.service';

describe('WritingController', () => {
  let controller: WritingController;
  const checkWriting = jest.fn();

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
          useValue: { checkWriting },
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

  it('allows a guest writing check without dereferencing a missing user', async () => {
    const dto = { text: 'I goes to school every day.' };
    checkWriting.mockResolvedValueOnce({ score: 72 });

    await expect(controller.checkWriting(dto, { user: null })).resolves.toEqual({ score: 72 });
    expect(checkWriting).toHaveBeenCalledWith(dto, undefined);
  });

  it('passes the authenticated user id to the writing check', async () => {
    const dto = { text: 'I go to school every day.' };
    checkWriting.mockResolvedValueOnce({ score: 90 });

    await controller.checkWriting(dto, { user: { id: 'user-1' } });
    expect(checkWriting).toHaveBeenCalledWith(dto, 'user-1');
  });
});
