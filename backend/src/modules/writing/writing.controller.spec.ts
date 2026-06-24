import { Test, TestingModule } from '@nestjs/testing';
import { WritingController } from './writing.controller';

describe('WritingController', () => {
  let controller: WritingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WritingController],
    }).compile();

    controller = module.get<WritingController>(WritingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
