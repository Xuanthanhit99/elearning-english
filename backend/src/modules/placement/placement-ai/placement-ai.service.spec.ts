import { Test, TestingModule } from '@nestjs/testing';
import { PlacementAiService } from './placement-ai.service';

describe('PlacementAiService', () => {
  let service: PlacementAiService;
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlacementAiService],
    }).compile();

    service = module.get<PlacementAiService>(PlacementAiService);
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
