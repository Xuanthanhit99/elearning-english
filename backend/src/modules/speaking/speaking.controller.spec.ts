import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

describe('SpeakingController', () => {
  let controller: SpeakingController;

  const speakingServiceMock = { getHome: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      // `generate-question` now carries @UseGuards(..., ThrottlerGuard)
      // (rate-limits the direct Gemini call) — ThrottlerGuard needs
      // THROTTLER:MODULE_OPTIONS/ThrottlerStorage from ThrottlerModule to be
      // instantiable, same as the real app.module.ts registration.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
      controllers: [SpeakingController],
      providers: [{ provide: SpeakingService, useValue: speakingServiceMock }],
    }).compile();

    controller = module.get<SpeakingController>(SpeakingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getHome delegates to SpeakingService with the authenticated user id', async () => {
    speakingServiceMock.getHome.mockResolvedValue({ hero: {} });

    const result = await controller.getHome({ user: { id: 'user-1' } });

    expect(speakingServiceMock.getHome).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ success: true, data: { hero: {} } });
  });
});
