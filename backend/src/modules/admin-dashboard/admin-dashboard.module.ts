import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { QueueAdminModule } from '../queue-admin/queue-admin.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';

@Module({
  imports: [
    AuditLogModule,
    FeatureFlagsModule,
    QueueAdminModule,
    AiUsageModule,
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
