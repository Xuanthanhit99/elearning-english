import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { SpeakingPracticeService } from './speaking-practice.service';

// SpeakingPracticeService is currently an empty stub (no methods) — this
// spec only proves the module wires up correctly; there is no behavior to
// test until the service gains methods.
describe('SpeakingPracticeService', () => {
  let service: SpeakingPracticeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeakingPracticeService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SpeakingPracticeService>(SpeakingPracticeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
