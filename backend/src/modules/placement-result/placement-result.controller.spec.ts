import { Test, TestingModule } from '@nestjs/testing';
import { PlacementResultController } from './placement-result.controller';

describe('PlacementResultController', () => {
  let controller: PlacementResultController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementResultController],
    }).compile();

    controller = module.get<PlacementResultController>(
      PlacementResultController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
