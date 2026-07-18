import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { SPEAKING_PROCESSING_QUEUE } from './speaking-processing.constants';
import { SpeakingAudioStorageService } from './speaking-audio-storage.service';
import { SpeakingProcessingService } from './speaking-processing.service';

describe('SpeakingProcessingService', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        SpeakingProcessingService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: SpeakingAudioStorageService,
          useValue: {},
        },
        {
          provide: getQueueToken(SPEAKING_PROCESSING_QUEUE),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    expect(module.get(SpeakingProcessingService)).toBeDefined();
  });
});
