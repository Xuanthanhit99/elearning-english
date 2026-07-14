"use client";

import {
  Bookmark,
  Check,
  Heart,
  Loader2,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  reactCommunityPost,
  removeCommunityReaction,
  toggleCommunityBookmark,
} from "@/src/lib/community-api";
import type {
  CommunityPost,
  CommunityReactionType,
} from "@/src/types/community";
import { CommunityCommentsPanel } from "./CommunityCommentsPanel";
import { CommunityFollowButton } from "../community-club/CommunityFollowButton";
import { useAuthStore } from "@/src/store/authStore";

const typeLabel: Record<string, string> = {
  SHARE: "Chia sẻ",
  QUESTION: "Hỏi đáp",
  SPEAKING: "Speaking",
  WRITING: "Writing",
  IMAGE: "Góc học tập",
  ACHIEVEMENT: "Thành tích",
  POLL: "Khảo sát",
};

type CommunityPostView = CommunityPost & {
  author: CommunityPost["author"] & {
    fullname?: string;
    name?: string;
  };
  viewerReaction?: CommunityReactionType | null;
  myReaction?: CommunityReactionType | null;
  bookmarked?: boolean;
  isBookmarked?: boolean;
};

function authorName(post: CommunityPostView) {
  return (
    post.author.fullname ||
    post.author.name ||
    post.author.username ||
    "Người dùng"
  );
}

export function CommunityPostCard({
  initialPost,
}: {
  initialPost: CommunityPost;
}) {
  const [post, setPost] = useState<CommunityPostView>(
    initialPost as CommunityPostView,
  );
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewerReaction = post.viewerReaction ?? post.myReaction ?? null;
  const bookmarked = post.bookmarked ?? post.isBookmarked ?? false;

  const postUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/community/posts/${post.id}`;
  }, [post.id]);

  async function toggleReaction() {
    if (reactionLoading) return;

    try {
      setReactionLoading(true);

      if (viewerReaction) {
        const result = await removeCommunityReaction(post.id);
        setPost((current) => ({
          ...current,
          viewerReaction: null,
          myReaction: null,
          reactionsCount:
            result.total ?? Math.max(current.reactionsCount - 1, 0),
        }));
      } else {
        const result = await reactCommunityPost(
          post.id,
          "LIKE" as CommunityReactionType,
        );
        setPost((current) => ({
          ...current,
          viewerReaction: "LIKE" as CommunityReactionType,
          myReaction: "LIKE" as CommunityReactionType,
          reactionsCount: result.total ?? current.reactionsCount + 1,
        }));
      }
    } finally {
      setReactionLoading(false);
    }
  }

  async function toggleBookmark() {
    if (bookmarkLoading) return;

    try {
      setBookmarkLoading(true);
      const result = await toggleCommunityBookmark(post.id, bookmarked);

      setPost((current) => ({
        ...current,
        bookmarked: Boolean(result.bookmarked),
        isBookmarked: Boolean(result.bookmarked),
      }));
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function sharePost() {
    const payload = {
      title: post.title || "Bài viết cộng đồng",
      text: post.content.slice(0, 180),
      url: postUrl,
    };

    if (navigator.share) {
      await navigator.share(payload);
      return;
    }

    await navigator.clipboard.writeText(postUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

    const user = useAuthStore((state) => state.user);

  return (
    <article className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-md">
      <div className="p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <img
              src={post.author.avatar || "/avatar-placeholder.png"}
              alt={authorName(post)}
              className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-300"
            />

            <div className="min-w-0">
              <div className="truncate font-extrabold text-slate-950">
                {authorName(post)}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-600">
                Level {post.author.level ?? 1} ·{" "}
                {new Date(post.createdAt).toLocaleString("vi-VN")}
              </div>
            </div>
            {user && post.author.id !== user.id ? <CommunityFollowButton
              userId={post.author.id}
              initialFollowing={Boolean(post.author.isFollowing)}
            /> : "" }
          </div>

          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
            {typeLabel[post.type] ?? post.type}
          </span>
        </header>

        <div className="mt-4 space-y-3">
          {post.title && (
            <h3 className="text-lg font-extrabold text-slate-950">
              {post.title}
            </h3>
          )}

          <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-800">
            {post.content}
          </p>

          {post.media?.map((media, index) => {
            if (media.type === "IMAGE") {
              return (
                <img
                  key={`${media.url}-${index}`}
                  src={media.url}
                  alt=""
                  className="max-h-[520px] w-full rounded-2xl border border-slate-200 object-cover"
                />
              );
            }

            if (media.type === "AUDIO") {
              return (
                <audio
                  key={`${media.url}-${index}`}
                  controls
                  className="w-full"
                  src={media.url}
                />
              );
            }

            return null;
          })}

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-5 grid grid-cols-4 gap-2 border-t-2 border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => void toggleReaction()}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition hover:bg-slate-100 ${
              viewerReaction ? "text-rose-600" : "text-slate-700"
            }`}
          >
            {reactionLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Heart
                size={20}
                fill={viewerReaction ? "currentColor" : "none"}
              />
            )}
            {post.reactionsCount}
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((value) => !value)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition hover:bg-slate-100 ${
              commentsOpen ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
            }`}
          >
            <MessageCircle size={20} />
            {post.commentsCount}
          </button>

          <button
            type="button"
            onClick={() => void sharePost()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            {copied ? <Check size={20} /> : <Share2 size={20} />}
            <span className="hidden sm:inline">
              {copied ? "Đã sao chép" : "Chia sẻ"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void toggleBookmark()}
            className={`flex min-h-11 items-center justify-center rounded-xl transition hover:bg-slate-100 ${
              bookmarked ? "text-indigo-700" : "text-slate-700"
            }`}
          >
            {bookmarkLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            )}
          </button>
        </footer>
      </div>

      {commentsOpen && (
        <section className="border-t-2 border-slate-100 bg-slate-50 px-5 py-5">
          <CommunityCommentsPanel
            postId={post.id}
            onCountChange={(delta) =>
              setPost((current) => ({
                ...current,
                commentsCount: current.commentsCount + delta,
              }))
            }
          />
        </section>
      )}
    </article>
  );
}
