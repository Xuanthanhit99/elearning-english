import { Test, TestingModule } from '@nestjs/testing';
import { ReadingService } from './reading.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';

describe('ReadingService', () => {
  let service: ReadingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingService,
        { provide: PrismaService, useValue: {} },
        { provide: MissionV2ProgressService, useValue: {} },
        { provide: LearningXpPublisher, useValue: {} },
      ],
    }).compile();

    service = module.get<ReadingService>(ReadingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
