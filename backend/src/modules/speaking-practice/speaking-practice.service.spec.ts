import { Test, TestingModule } from '@nestjs/testing';
import { SpeakingPracticeService } from './speaking-practice.service';

describe('SpeakingPracticeService', () => {
  let service: SpeakingPracticeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeakingPracticeService],
    }).compile();

    service = module.get<SpeakingPracticeService>(SpeakingPracticeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
