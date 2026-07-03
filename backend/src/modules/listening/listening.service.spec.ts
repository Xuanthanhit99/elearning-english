import { Test, TestingModule } from '@nestjs/testing';
import { ListeningService } from './listening.service';

describe('ListeningService', () => {
  let service: ListeningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListeningService],
    }).compile();

    service = module.get<ListeningService>(ListeningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
