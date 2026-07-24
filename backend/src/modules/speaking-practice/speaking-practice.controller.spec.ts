import { Test, TestingModule } from '@nestjs/testing';
import { SpeakingPracticeController } from './speaking-practice.controller';
import { SpeakingService } from '../speaking/speaking.service';

describe('SpeakingPracticeController', () => {
  let controller: SpeakingPracticeController;

  const speakingServiceMock = {
    getPracticeSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpeakingPracticeController],
      providers: [{ provide: SpeakingService, useValue: speakingServiceMock }],
    }).compile();

    controller = module.get<SpeakingPracticeController>(
      SpeakingPracticeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getPracticeSession delegates to SpeakingService with the authenticated user id', async () => {
    speakingServiceMock.getPracticeSession.mockResolvedValue({ id: 'session-1' });

    const result = await controller.getPracticeSession(
      { user: { id: 'user-1' } },
      'session-1',
    );

    expect(speakingServiceMock.getPracticeSession).toHaveBeenCalledWith(
      'user-1',
      'session-1',
    );
    expect(result).toEqual({ success: true, data: { id: 'session-1' } });
  });
});
