import { Test, TestingModule } from '@nestjs/testing';
import { PlacementProcessingController } from './placement-processing.controller';

describe('PlacementProcessingController', () => {
  let controller: PlacementProcessingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacementProcessingController],
    }).compile();

    controller = module.get<PlacementProcessingController>(
      PlacementProcessingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
