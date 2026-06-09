import { Test, TestingModule } from '@nestjs/testing';
import { CoursePagesController } from './course-pages.controller';

describe('CoursePagesController', () => {
  let controller: CoursePagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursePagesController],
    }).compile();

    controller = module.get<CoursePagesController>(CoursePagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
