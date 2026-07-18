import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { COMMUNITY_JOB, COMMUNITY_QUEUE } from '../community.constants';
import { CommunityGateway } from '../gateway/community.gateway';

@Injectable()
@Processor(COMMUNITY_QUEUE)
export class CommunityProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunityProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CommunityGateway,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<Record<string, string>>) {
    switch (job.name) {
      case COMMUNITY_JOB.CREATE_COMMENT_NOTIFICATION:
        return this.createCommentNotification(job.data);
      case COMMUNITY_JOB.CREATE_REACTION_NOTIFICATION:
        return this.createReactionNotification(job.data);
      case COMMUNITY_JOB.CREATE_FOLLOW_NOTIFICATION:
        return this.createFollowNotification(job.data);
      case COMMUNITY_JOB.RECALCULATE_POST_SCORE:
        return this.recalculatePostScore(job.data.postId);
      default:
        throw new Error(`Unsupported community job: ${job.name}`);
    }
  }

  private async createCommentNotification(data: Record<string, string>) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: data.postId },
      select: { authorId: true },
    });
    if (!post || post.authorId === data.actorId) return;

    const notification = await this.prisma.communityNotification.create({
      data: {
        userId: post.authorId,
        actorId: data.actorId,
        postId: data.postId,
        commentId: data.commentId,
        type: 'POST_COMMENT',
        title: 'Bình luận mới',
        message: 'Có người vừa bình luận bài viết của bạn.',
      },
    });
    this.gateway.emitNotification(post.authorId, notification);
    await this.notifications.createFromPayload({
      userId: post.authorId,
      type: 'COMMUNITY',
      title: 'Binh luan moi',
      message: 'Co nguoi vua binh luan bai viet cua ban.',
      href: `/community/posts/${data.postId}`,
    });
  }

  private async createReactionNotification(data: Record<string, string>) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: data.postId },
      select: { authorId: true },
    });
    if (!post || post.authorId === data.actorId) return;

    const notification = await this.prisma.communityNotification.create({
      data: {
        userId: post.authorId,
        actorId: data.actorId,
        postId: data.postId,
        type: 'POST_REACTION',
        title: 'Tương tác mới',
        message: 'Có người vừa bày tỏ cảm xúc với bài viết của bạn.',
      },
    });
    this.gateway.emitNotification(post.authorId, notification);
    await this.notifications.createFromPayload({
      userId: post.authorId,
      type: 'COMMUNITY',
      title: 'Tuong tac moi',
      message: 'Co nguoi vua bay to cam xuc voi bai viet cua ban.',
      href: `/community/posts/${data.postId}`,
    });
  }

  private async createFollowNotification(data: Record<string, string>) {
    const notification = await this.prisma.communityNotification.create({
      data: {
        userId: data.followingId,
        actorId: data.followerId,
        type: 'NEW_FOLLOWER',
        title: 'Người theo dõi mới',
        message: 'Có người vừa theo dõi bạn.',
      },
    });
    this.gateway.emitNotification(data.followingId, notification);
    await this.notifications.createFromPayload({
      userId: data.followingId,
      type: 'COMMUNITY',
      title: 'Nguoi theo doi moi',
      message: 'Co nguoi vua theo doi ban.',
      href: '/community',
    });
  }

  private async recalculatePostScore(postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: {
        reactionsCount: true,
        commentsCount: true,
        bookmarksCount: true,
      },
    });
    if (!post) return;
    const score =
      post.reactionsCount * 2 +
      post.commentsCount * 3 +
      post.bookmarksCount * 4;
    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { score },
    });
    this.logger.debug(`Updated score for ${postId}: ${score}`);
  }
}
