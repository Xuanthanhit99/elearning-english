import { Test, TestingModule } from '@nestjs/testing';
import { CourseLandingService } from './course-landing.service';

describe('CourseLandingService', () => {
  let service: CourseLandingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseLandingService],
    }).compile();

    service = module.get<CourseLandingService>(CourseLandingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
