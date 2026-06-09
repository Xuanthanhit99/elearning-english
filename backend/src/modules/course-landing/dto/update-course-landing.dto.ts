import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseLandingDto } from './create-course-landing.dto';

export class UpdateCourseLandingDto extends PartialType(
  CreateCourseLandingDto,
) {}
