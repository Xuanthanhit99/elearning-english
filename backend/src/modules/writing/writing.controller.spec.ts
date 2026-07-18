import { Test, TestingModule } from '@nestjs/testing';
import { WritingController } from './writing.controller';
import { WritingHistoryService } from './writing-history.service';
import { WritingProcessingService } from './writing-processing.service';
import { WritingService } from './writing.service';

describe('WritingController', () => {
  let controller: WritingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WritingController],
      providers: [
        {
          provide: WritingService,
          useValue: {},
        },
        {
          provide: WritingProcessingService,
          useValue: {},
        },
        {
          provide: WritingHistoryService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<WritingController>(WritingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
