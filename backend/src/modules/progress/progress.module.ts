import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PetsModule } from '../pets/pets.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PetsModule, DashboardModule, SettingsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
