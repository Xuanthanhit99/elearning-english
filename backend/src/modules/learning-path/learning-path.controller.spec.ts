import { Test, TestingModule } from '@nestjs/testing';
import { LearningPathAccessGuard } from '../learning-path-access/learning-path-access.guard';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';

describe('LearningPathController', () => {
  let controller: LearningPathController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningPathController],
      providers: [
        {
          provide: LearningPathService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(LearningPathAccessGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<LearningPathController>(LearningPathController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
