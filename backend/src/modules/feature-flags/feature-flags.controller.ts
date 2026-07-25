import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureFlagsService } from './feature-flags.service';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  // Public-safe (key -> boolean only) — any authenticated user, not
  // admin-only, since this is what the frontend reads to decide whether to
  // render AI Conversation/Study Together/etc. Admin CRUD lives under
  // /admin-dashboard/operations/feature-flags instead.
  @Get()
  getPublicFlags() {
    return this.service.getPublicFlags();
  }
}
