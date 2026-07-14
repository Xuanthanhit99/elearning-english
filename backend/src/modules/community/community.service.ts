import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommunityReactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityJobService } from './community-job.service';
import { CreateCommunityCommentDto } from './dto/create-community-comment.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { GetCommunityFeedDto } from './dto/get-community-feed.dto';
import { UpdateCommunityPostDto } from './dto/update-community-post.dto';
import { CommunityGateway } from './gateway/community.gateway';

const COMMUNITY_AUTHOR_SELECT = {
  id: true,
  fullname: true,
  username: true,
  avatar: true,
  level: true,
  xp: true,
} satisfies Prisma.UserSelect;

type CommunityPostMapped = Prisma.CommunityPostGetPayload<{
  include: {
    author: {
      select: typeof COMMUNITY_AUTHOR_SELECT;
    };
    comments: {
      include: {
        author: {
          select: typeof COMMUNITY_AUTHOR_SELECT;
        };
        _count: {
          select: {
            replies: true;
          };
        };
      };
    };
    reactions: {
      select: {
        id: true;
        userId: true;
        type: true;
      };
    };
    bookmarks: {
      select: {
        id: true;
        userId: true;
      };
    };
    _count: {
      select: {
        comments: true;
        reactions: true;
        bookmarks: true;
      };
    };
  };
}>;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: CommunityJobService,
    private readonly gateway: CommunityGateway,
  ) {}

  async getFeed(userId: string | undefined, query: GetCommunityFeedDto) {
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 30);

    const cursor = query.cursor?.trim() || undefined;
    const search = query.search?.trim();

    const where: Prisma.CommunityPostWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,

      ...(query.type
        ? {
            type: query.type,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                content: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                tags: {
                  has: search.replace(/^#/, ''),
                },
              },
            ],
          }
        : {}),
    };

    if (query.tab === 'FOLLOWING') {
      if (!userId) {
        throw new UnauthorizedException(
          'Bạn cần đăng nhập để xem tab đang theo dõi',
        );
      }

      const follows = await this.prisma.communityFollow.findMany({
        where: {
          followerId: userId,
        },
        select: {
          followingId: true,
        },
      });

      where.authorId = {
        in: follows.map((item) => item.followingId),
      };
    }

    const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
      query.tab === 'POPULAR'
        ? [
            {
              score: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ]
        : [
            {
              createdAt: 'desc',
            },
          ];

    const posts = await this.prisma.communityPost.findMany({
      where,
      take: limit + 1,

      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),

      orderBy,

      include: this.postInclude(userId),
    });

    const hasMore = posts.length > limit;

    const items = hasMore ? posts.slice(0, limit) : posts;

    return {
      items: items.map((post) => this.mapPost(post)),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async getPost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, deletedAt: null },
      include: {
        ...this.postInclude(userId),
        comments: {
          where: { deletedAt: null, parentId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: COMMUNITY_AUTHOR_SELECT },
            _count: {
              select: {
                replies: true,
              },
            },
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: COMMUNITY_AUTHOR_SELECT },
              },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return this.mapPost(post);
  }

  async createPost(userId: string, dto: CreateCommunityPostDto) {
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: userId,
        type: dto.type,
        visibility: dto.visibility ?? 'PUBLIC',
        title: dto.title?.trim() || null,
        content: dto.content.trim(),
        category: dto.category?.trim() || null,
        level: dto.level?.trim() || null,
        clubId: dto.clubId,
        tags: this.normalizeTags(dto.tags),
        media: dto.media ? this.toJsonValue(dto.media) : Prisma.JsonNull,
        pollData: dto.pollData
          ? this.toJsonValue(dto.pollData)
          : Prisma.JsonNull,
      },
      include: this.postInclude(userId),
    });
    const mapped = this.mapPost(post);
    this.gateway.emitPostCreated(mapped);
    return mapped;
  }

  async updatePost(
    userId: string,
    postId: string,
    dto: UpdateCommunityPostDto,
  ) {
    await this.assertPostOwner(userId, postId);
    const post = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        ...(dto.title !== undefined
          ? { title: dto.title?.trim() || null }
          : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.category !== undefined
          ? { category: dto.category?.trim() || null }
          : {}),
        ...(dto.level !== undefined
          ? { level: dto.level?.trim() || null }
          : {}),
        ...(dto.tags !== undefined
          ? { tags: this.normalizeTags(dto.tags) }
          : {}),
        ...(dto.media !== undefined
          ? {
              media:
                dto.media.length > 0
                  ? this.toJsonValue(dto.media)
                  : Prisma.JsonNull,
            }
          : {}),
        isEdited: true,
      },
      include: this.postInclude(userId),
    });
    const mapped = this.mapPost(post);
    this.gateway.emitPostUpdated(mapped);
    return mapped;
  }

  async deletePost(userId: string, postId: string) {
    await this.assertPostOwner(userId, postId);
    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
    this.gateway.emitPostDeleted(postId);
    return { success: true };
  }

  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommunityCommentDto,
  ) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: {
          postId,
          authorId: userId,
          parentId: dto.parentId,
          content: dto.content.trim(),
          media: dto.media ? this.toJsonValue(dto.media) : Prisma.JsonNull,
        },
        include: {
          author: { select: COMMUNITY_AUTHOR_SELECT },
        },
      });
      await tx.communityPost.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });
      return created;
    });

    this.gateway.emitCommentCreated(postId, comment);
    await Promise.all([
      this.jobs.addCommentNotification({
        postId,
        commentId: comment.id,
        actorId: userId,
      }),
      this.jobs.recalculatePostScore(postId),
    ]);
    return comment;
  }

  async reactPost(userId: string, postId: string, type: CommunityReactionType) {
    const existing = await this.prisma.communityReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.communityReaction.upsert({
        where: { postId_userId: { postId, userId } },
        create: { postId, userId, type },
        update: { type },
      });
      if (!existing)
        await tx.communityPost.update({
          where: { id: postId },
          data: { reactionsCount: { increment: 1 } },
        });
    });
    const summary = await this.getReactionSummary(postId, userId);
    this.gateway.emitReactionUpdated(postId, summary);
    await Promise.all([
      this.jobs.addReactionNotification({ postId, actorId: userId }),
      this.jobs.recalculatePostScore(postId),
    ]);
    return summary;
  }

  async removeReaction(userId: string, postId: string) {
    const existing = await this.prisma.communityReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.communityReaction.delete({
          where: { postId_userId: { postId, userId } },
        }),
        this.prisma.communityPost.update({
          where: { id: postId },
          data: { reactionsCount: { decrement: 1 } },
        }),
      ]);
    }
    const summary = await this.getReactionSummary(postId, userId);
    this.gateway.emitReactionUpdated(postId, summary);
    await this.jobs.recalculatePostScore(postId);
    return summary;
  }

  async bookmark(userId: string, postId: string) {
    const existing = await this.prisma.communityBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.communityBookmark.create({ data: { postId, userId } }),
        this.prisma.communityPost.update({
          where: { id: postId },
          data: { bookmarksCount: { increment: 1 } },
        }),
      ]);
      await this.jobs.recalculatePostScore(postId);
    }
    return { bookmarked: true };
  }

  async removeBookmark(userId: string, postId: string) {
    const existing = await this.prisma.communityBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.communityBookmark.delete({
          where: { postId_userId: { postId, userId } },
        }),
        this.prisma.communityPost.update({
          where: { id: postId },
          data: { bookmarksCount: { decrement: 1 } },
        }),
      ]);
      await this.jobs.recalculatePostScore(postId);
    }
    return { bookmarked: false };
  }

  async follow(userId: string, followingId: string) {
    if (userId === followingId)
      throw new ForbiddenException('Không thể tự theo dõi chính mình');
    await this.prisma.communityFollow.upsert({
      where: { followerId_followingId: { followerId: userId, followingId } },
      create: { followerId: userId, followingId },
      update: {},
    });
    await this.jobs.addFollowNotification({ followerId: userId, followingId });
    return { following: true };
  }

  async unfollow(userId: string, followingId: string) {
    await this.prisma.communityFollow.deleteMany({
      where: { followerId: userId, followingId },
    });
    return { following: false };
  }

  private postInclude(userId?: string) {
    const safeUserId = userId ?? '__anonymous__';

    return {
      author: {
        select: COMMUNITY_AUTHOR_SELECT,
      },

      comments: {
        where: {
          deletedAt: null,
          parentId: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 2,
        include: {
          author: {
            select: COMMUNITY_AUTHOR_SELECT,
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      },

      reactions: {
        where: {
          userId: safeUserId,
        },
        select: {
          id: true,
          userId: true,
          type: true,
        },
      },

      bookmarks: {
        where: {
          userId: safeUserId,
        },
        select: {
          id: true,
          userId: true,
        },
      },

      _count: {
        select: {
          comments: true,
          reactions: true,
          bookmarks: true,
        },
      },
    } satisfies Prisma.CommunityPostInclude;
  }

  private mapPost(post: CommunityPostMapped) {
    return {
      ...post,
      myReaction: post.reactions[0]?.type ?? null,
      isBookmarked: post.bookmarks.length > 0,
      commentsCount: post._count.comments,
      reactionsCount: post._count.reactions,
      bookmarksCount: post._count.bookmarks,
    };
  }

  private async assertPostOwner(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, deletedAt: null },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    if (post.authorId !== userId)
      throw new ForbiddenException('Bạn không có quyền thay đổi bài viết này');
  }

  private async getReactionSummary(postId: string, userId: string) {
    const [groups, mine] = await Promise.all([
      this.prisma.communityReaction.groupBy({
        by: ['type'],
        where: { postId },
        _count: true,
      }),
      this.prisma.communityReaction.findUnique({
        where: { postId_userId: { postId, userId } },
      }),
    ]);
    return {
      postId,
      total: groups.reduce((sum, item) => sum + item._count, 0),
      byType: Object.fromEntries(
        groups.map((item) => [item.type, item._count]),
      ),
      viewerReaction: mine?.type ?? null,
    };
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private normalizeTags(tags?: string[]) {
    return [
      ...new Set(
        (tags ?? [])
          .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 8);
  }
}
