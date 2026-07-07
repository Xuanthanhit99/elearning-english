import { Test, TestingModule } from '@nestjs/testing';
import { ReadingJobService } from './reading-job.service';

describe('ReadingJobService', () => {
  let service: ReadingJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadingJobService],
    }).compile();

    service = module.get<ReadingJobService>(ReadingJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
