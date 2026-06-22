import { Test, TestingModule } from '@nestjs/testing';
import { SpeakingService } from './speaking.service';

describe('SpeakingService', () => {
  let service: SpeakingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpeakingService],
    }).compile();

    service = module.get<SpeakingService>(SpeakingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
