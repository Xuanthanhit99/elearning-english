import { Test, TestingModule } from '@nestjs/testing';
import { SpeakingJobService } from './speaking-job.service';

describe('SpeakingJobService', () => {
  let service: SpeakingJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeakingJobService],
    }).compile();

    service = module.get<SpeakingJobService>(SpeakingJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
