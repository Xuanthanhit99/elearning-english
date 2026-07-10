import { Test, TestingModule } from '@nestjs/testing';
import { PlacementTestController } from './placement-test.controller';

describe('PlacementTestController', () => {
  let controller: PlacementTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementTestController],
    }).compile();

    controller = module.get<PlacementTestController>(PlacementTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
