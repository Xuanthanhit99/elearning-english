import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('courses/:courseId')
  @UseGuards(JwtAuthGuard)
  createOrUpdate(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createOrUpdate(req.user.id, courseId, dto);
  }

  @Get('courses/:courseId')
  getCourseReviews(@Param('courseId') courseId: string) {
    return this.reviewsService.getCourseReviews(courseId);
  }
}
