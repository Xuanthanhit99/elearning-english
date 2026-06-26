import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
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

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(@Req() req: any, @Body() dto: GeneratePlacementTestDto) {
    return this.service.generateTest(req.user.id, dto);
  }
}
