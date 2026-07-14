import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { COMMUNITY_JOB, COMMUNITY_QUEUE } from './community.constants';

@Injectable()
export class CommunityJobService {
  constructor(@InjectQueue(COMMUNITY_QUEUE) private readonly queue: Queue) {}

  addCommentNotification(data: {
    postId: string;
    commentId: string;
    actorId: string;
  }) {
    return this.queue.add(
      COMMUNITY_JOB.CREATE_COMMENT_NOTIFICATION,
      data,
      this.options(`comment-${data.commentId}`),
    );
  }

  addReactionNotification(data: { postId: string; actorId: string }) {
    return this.queue.add(
      COMMUNITY_JOB.CREATE_REACTION_NOTIFICATION,
      data,
      this.options(`reaction-${data.postId}-${data.actorId}`),
    );
  }

  addFollowNotification(data: { followerId: string; followingId: string }) {
    return this.queue.add(
      COMMUNITY_JOB.CREATE_FOLLOW_NOTIFICATION,
      data,
      this.options(`follow-${data.followerId}-${data.followingId}`),
    );
  }

  recalculatePostScore(postId: string) {
    return this.queue.add(
      COMMUNITY_JOB.RECALCULATE_POST_SCORE,
      { postId },
      {
        ...this.options(`score-${postId}-${Date.now()}`),
        delay: 500,
      },
    );
  }

  private options(jobId: string) {
    return {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    };
  }
}
