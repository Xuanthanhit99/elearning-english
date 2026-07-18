import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { ListeningJobService } from './listening-job.service';
import { LISTENING_GENERATION_QUEUE } from './listening-job.constants';

describe('ListeningJobService', () => {
  let service: ListeningJobService;

  const queueMock = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListeningJobService,
        {
          provide: getQueueToken(LISTENING_GENERATION_QUEUE),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<ListeningJobService>(ListeningJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
