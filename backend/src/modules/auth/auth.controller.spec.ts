import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VocabularyJobService } from '../vocabulary-job/vocabulary-job.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // Several routes carry @UseGuards(..., ThrottlerGuard) — ThrottlerGuard
      // needs THROTTLER:MODULE_OPTIONS/ThrottlerStorage from ThrottlerModule
      // to be instantiable, same as the real app.module.ts registration.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: VocabularyJobService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
