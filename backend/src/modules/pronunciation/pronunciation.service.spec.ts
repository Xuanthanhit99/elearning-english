import { Test, TestingModule } from '@nestjs/testing';
import { PronunciationService } from './pronunciation.service';

describe('PronunciationService', () => {
  let service: PronunciationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PronunciationService],
    }).compile();

    service = module.get<PronunciationService>(PronunciationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
