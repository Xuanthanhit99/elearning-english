import { Test, TestingModule } from '@nestjs/testing';
import { CoursePagesService } from './course-pages.service';

describe('CoursePagesService', () => {
  let service: CoursePagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursePagesService],
    }).compile();

    service = module.get<CoursePagesService>(CoursePagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
