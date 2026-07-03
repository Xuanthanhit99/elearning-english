import { Test, TestingModule } from '@nestjs/testing';
import { ListeningJobService } from './listening-job.service';

describe('ListeningJobService', () => {
  let service: ListeningJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListeningJobService],
    }).compile();

    service = module.get<ListeningJobService>(ListeningJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
