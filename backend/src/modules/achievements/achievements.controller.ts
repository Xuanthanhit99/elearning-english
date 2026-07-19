import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';
import { AchievementQueryDto } from './dto/achievement-query.dto';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Query() query: AchievementQueryDto,
  ) {
    return this.achievements.list(user.id, query);
  }

  @Get('overview')
  overview(@CurrentUser() user: { id: string }) {
    return this.achievements.overview(user.id);
  }

  @Get('history')
  history(@CurrentUser() user: { id: string }) {
    return this.achievements.history(user.id);
  }

  @Get(':code')
  detail(@CurrentUser() user: { id: string }, @Param('code') code: string) {
    return this.achievements.detail(user.id, code);
  }

  @Post(':code/claim')
  claim(@CurrentUser() user: { id: string }, @Param('code') code: string) {
    return this.achievements.claim(user.id, code);
  }
}
