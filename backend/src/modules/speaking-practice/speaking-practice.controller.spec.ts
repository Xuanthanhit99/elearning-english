import { Test, TestingModule } from '@nestjs/testing';
import { SpeakingPracticeController } from './speaking-practice.controller';

describe('SpeakingPracticeController', () => {
  let controller: SpeakingPracticeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpeakingPracticeController],
    }).compile();

    controller = module.get<SpeakingPracticeController>(SpeakingPracticeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
