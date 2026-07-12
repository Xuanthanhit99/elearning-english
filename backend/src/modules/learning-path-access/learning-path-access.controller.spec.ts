import { Test, TestingModule } from '@nestjs/testing';
import { LearningPathAccessController } from './learning-path-access.controller';

describe('LearningPathAccessController', () => {
  let controller: LearningPathAccessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningPathAccessController],
    }).compile();

    controller = module.get<LearningPathAccessController>(LearningPathAccessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
