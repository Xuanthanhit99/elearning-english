import { Test, TestingModule } from '@nestjs/testing';
import { ListeningController } from './listening.controller';

describe('ListeningController', () => {
  let controller: ListeningController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListeningController],
    }).compile();

    controller = module.get<ListeningController>(ListeningController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
