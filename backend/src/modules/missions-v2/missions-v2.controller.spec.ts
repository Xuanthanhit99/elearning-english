import { Test, TestingModule } from '@nestjs/testing';
import { MissionsV2Controller } from './missions-v2.controller';
import { MissionV2ProgressService } from './services/mission-v2-progress.service';
import { MissionV2QueryService } from './services/mission-v2-query.service';
import { MissionV2RewardService } from './services/mission-v2-reward.service';

describe('MissionsV2Controller', () => {
  let controller: MissionsV2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionsV2Controller],
      providers: [
        { provide: MissionV2QueryService, useValue: {} },
        { provide: MissionV2ProgressService, useValue: {} },
        { provide: MissionV2RewardService, useValue: {} },
      ],
    }).compile();

    controller = module.get<MissionsV2Controller>(MissionsV2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
