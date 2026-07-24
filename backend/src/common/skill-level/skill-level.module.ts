import { Global, Module } from '@nestjs/common';
import { SkillLevelResolverService } from './skill-level-resolver.service';

/**
 * Global so any skill module (Vocabulary/Grammar/Reading/Listening/
 * Speaking/Writing) and the Learning Path module can inject
 * SkillLevelResolverService without an explicit import, matching the
 * existing RedisCacheModule/PrismaModule pattern in this codebase.
 */
@Global()
@Module({
  providers: [SkillLevelResolverService],
  exports: [SkillLevelResolverService],
})
export class SkillLevelModule {}
