import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SubmitPlacementTestDto } from './dto/submit-placement-test.dto';
import { PlacementTestsService } from './placement-tests.service';
import { GeneratePlacementTestDto } from './dto/generate-placement-test.dto';

@Controller('placement-tests')
export class PlacementTestsController {
  constructor(private readonly service: PlacementTestsService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(@Req() req: any, @Body() dto: SubmitPlacementTestDto) {
    return this.service.submitTest(req.user.id, dto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(@Req() req: any) {
    return this.service.getHistory(req.user.id);
  }

  // Legacy endpoint: generates a full 20-question test synchronously per
  // request with no DB check, no persistence, and no reuse (superseded by
  // the locked/persisted flow in `placement`/`question-bank`). Confirmed
  // unused by the current frontend (no caller references `/placement-tests`
  // anywhere in english-web-build). Kept for backward compatibility rather
  // than removed, but throttled hard so it can't be used to run unbounded
  // concurrent Gemini generations.
  @Post('generate')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  generate(@Req() req: any, @Body() dto: GeneratePlacementTestDto) {
    return this.service.generateTest(req.user.id, dto);
  }
}
