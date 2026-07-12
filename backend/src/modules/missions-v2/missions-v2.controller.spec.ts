import { Test, TestingModule } from '@nestjs/testing';
import { MissionsV2Controller } from './missions-v2.controller';

describe('MissionsV2Controller', () => {
  let controller: MissionsV2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionsV2Controller],
    }).compile();

    controller = module.get<MissionsV2Controller>(MissionsV2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
