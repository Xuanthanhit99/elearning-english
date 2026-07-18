import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityCommentDto } from './dto/create-community-comment.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { GetCommunityFeedDto } from './dto/get-community-feed.dto';
import { ReactCommunityPostDto } from './dto/react-community-post.dto';
import { UpdateCommunityPostDto } from './dto/update-community-post.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  private userId(req: any) {
    return req.user.id;
  }

  @Get('feed')
  getFeed(@Req() req: any, @Query() query: GetCommunityFeedDto) {
    return this.service.getFeed(this.userId(req), query);
  }

  @Get('posts/:postId')
  getPost(@Req() req: any, @Param('postId') postId: string) {
    return this.service.getPost(this.userId(req), postId);
  }

  @Post('posts')
  createPost(@Req() req: any, @Body() dto: CreateCommunityPostDto) {
    return this.service.createPost(this.userId(req), dto);
  }

  @Patch('posts/:postId')
  updatePost(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: UpdateCommunityPostDto,
  ) {
    return this.service.updatePost(this.userId(req), postId, dto);
  }

  @Delete('posts/:postId')
  deletePost(@Req() req: any, @Param('postId') postId: string) {
    return this.service.deletePost(this.userId(req), postId);
  }

  @Post('posts/:postId/comments')
  createComment(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: CreateCommunityCommentDto,
  ) {
    return this.service.createComment(this.userId(req), postId, dto);
  }

  @Post('posts/:postId/reactions')
  react(
    @Req() req: any,
    @Param('postId') postId: string,
    @Body() dto: ReactCommunityPostDto,
  ) {
    return this.service.reactPost(this.userId(req), postId, dto.type);
  }

  @Delete('posts/:postId/reactions')
  removeReaction(@Req() req: any, @Param('postId') postId: string) {
    return this.service.removeReaction(this.userId(req), postId);
  }

  @Post('posts/:postId/bookmark')
  bookmark(@Req() req: any, @Param('postId') postId: string) {
    return this.service.bookmark(this.userId(req), postId);
  }

  @Delete('posts/:postId/bookmark')
  removeBookmark(@Req() req: any, @Param('postId') postId: string) {
    return this.service.removeBookmark(this.userId(req), postId);
  }

  @Post('users/:userId/follow')
  follow(@Req() req: any, @Param('userId') userId: string) {
    return this.service.follow(this.userId(req), userId);
  }

  @Delete('users/:userId/follow')
  unfollow(@Req() req: any, @Param('userId') userId: string) {
    return this.service.unfollow(this.userId(req), userId);
  }
}
