import { Test, TestingModule } from '@nestjs/testing';
import { CourseLandingController } from './course-landing.controller';

describe('CourseLandingController', () => {
  let controller: CourseLandingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseLandingController],
    }).compile();

    controller = module.get<CourseLandingController>(CourseLandingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
