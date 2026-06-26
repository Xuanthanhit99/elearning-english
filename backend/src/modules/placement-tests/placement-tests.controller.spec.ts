import { Test, TestingModule } from '@nestjs/testing';
import { PlacementTestsController } from './placement-tests.controller';

describe('PlacementTestsController', () => {
  let controller: PlacementTestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementTestsController],
    }).compile();

    controller = module.get<PlacementTestsController>(PlacementTestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
