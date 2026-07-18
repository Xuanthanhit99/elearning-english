import { Test, TestingModule } from '@nestjs/testing';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';

describe('ListeningController', () => {
  let controller: ListeningController;

  const listeningServiceMock = {
    getHome: jest.fn(),
    getHistory: jest.fn(),
    startPractice: jest.fn(),
    submitAnswer: jest.fn(),
    skipQuestion: jest.fn(),
    flagQuestion: jest.fn(),
    finishSession: jest.fn(),
    getSessionResult: jest.fn(),
    rateSession: jest.fn(),
    retrySession: jest.fn(),
    continueSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListeningController],
      providers: [
        { provide: ListeningService, useValue: listeningServiceMock },
      ],
    }).compile();

    controller = module.get<ListeningController>(ListeningController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
