import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CarePetDto } from './dto/care-pet.dto';
import { UpsertPetDto } from './dto/upsert-pet.dto';
import { PetsService } from './pets.service';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get('me')
  getMyPet(@Req() req: any) {
    return this.petsService.getMyPet(req.user.id);
  }

  @Post('me')
  upsertMyPet(@Req() req: any, @Body() dto: UpsertPetDto) {
    return this.petsService.upsertMyPet(req.user.id, dto);
  }

  @Patch('me/care')
  careForPet(@Req() req: any, @Body() dto: CarePetDto) {
    return this.petsService.careForPet(req.user.id, dto);
  }

  @Post('lessons/:lessonId/reward')
  rewardLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.petsService.rewardLesson(req.user.id, lessonId);
  }
}
