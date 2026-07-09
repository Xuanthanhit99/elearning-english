import { Test, TestingModule } from '@nestjs/testing';
import { WritingJobService } from './writing-job.service';

describe('WritingJobService', () => {
  let service: WritingJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WritingJobService],
    }).compile();

    service = module.get<WritingJobService>(WritingJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
