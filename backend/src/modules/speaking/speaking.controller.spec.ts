import { Test, TestingModule } from '@nestjs/testing';
import { SpeakingController } from './speaking.controller';

describe('SpeakingController', () => {
  let controller: SpeakingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpeakingController],
    }).compile();

    controller = module.get<SpeakingController>(SpeakingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
