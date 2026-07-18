import { Test, TestingModule } from '@nestjs/testing';
import { LearningPathAccessController } from './learning-path-access.controller';
import { LearningPathAccessService } from './learning-path-access.service';

describe('LearningPathAccessController', () => {
  let controller: LearningPathAccessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningPathAccessController],
      providers: [
        {
          provide: LearningPathAccessService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<LearningPathAccessController>(LearningPathAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
