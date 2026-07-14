'use client';

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  Reply,
  Send,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { createCommunityComment } from '@/src/lib/community-api';
import { getPostComments } from '@/src/lib/community-social-api';
import type { CommunityCommentItem } from '@/src/types/community-social';

function formatTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CommunityCommentsPanel({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (delta: number) => void;
}) {
  const [comments, setComments] = useState<CommunityCommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityCommentItem | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  async function loadComments() {
    try {
      setLoading(true);
      setError('');

      const data = await getPostComments(postId);
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không thể tải các bình luận trước đó',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadComments();
  }, [postId]);

  async function submitRootComment() {
    const value = content.trim();
    if (!value || submitting) return;

    try {
      setSubmitting(true);
      setError('');

      const created = await createCommunityComment(postId, value);

      setComments((current) => [
        ...current,
        {
          ...created,
          replies: [],
          _count: { replies: 0 },
        },
      ]);

      setContent('');
      onCountChange?.(1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể gửi bình luận',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply() {
    const value = replyContent.trim();
    if (!replyTo || !value || submitting) return;

    try {
      setSubmitting(true);
      setError('');

      const created = await createCommunityComment(
        postId,
        value,
        replyTo.id,
      );

      setComments((current) =>
        current.map((comment) =>
          comment.id === replyTo.id
            ? {
                ...comment,
                replies: [...(comment.replies ?? []), created],
                _count: {
                  replies: (comment._count?.replies ?? 0) + 1,
                },
              }
            : comment,
        ),
      );

      setExpanded((current) => ({
        ...current,
        [replyTo.id]: true,
      }));

      setReplyTo(null);
      setReplyContent('');
      onCountChange?.(1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Không thể trả lời bình luận',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
        <Loader2 className="animate-spin text-indigo-600" size={20} />
        Đang tải bình luận...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
          <button
            type="button"
            onClick={() => void loadComments()}
            className="ml-3 font-bold underline"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submitRootComment();
            }
          }}
          rows={2}
          placeholder="Viết bình luận..."
          className="min-h-[52px] flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500"
        />

        <button
          type="button"
          onClick={() => void submitRootComment()}
          disabled={submitting || !content.trim()}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <Send size={19} />
          )}
        </button>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
          <MessageCircle
            size={24}
            className="mx-auto text-slate-400"
          />
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Chưa có bình luận
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Hãy bắt đầu cuộc trò chuyện.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => {
            const replyCount =
              comment._count?.replies ??
              comment.replies?.length ??
              0;

            const isExpanded = Boolean(expanded[comment.id]);
            const replies = isExpanded
              ? comment.replies ?? []
              : (comment.replies ?? []).slice(0, 1);

            return (
              <Fragment key={comment.id}>
                <div className="flex gap-3">
                  <img
                    src={
                      comment.author.avatar ||
                      '/avatar-placeholder.png'
                    }
                    alt={comment.author.fullname}
                    className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-slate-950">
                          {comment.author.fullname}
                        </strong>
                        <span className="text-xs font-medium text-slate-500">
                          {formatTime(comment.createdAt)}
                        </span>
                      </div>

                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                        {comment.content}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-4 pl-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(comment);
                          setReplyContent(
                            `@${comment.author.fullname} `,
                          );
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-indigo-700"
                      >
                        <Reply size={14} />
                        Trả lời
                      </button>

                      {replyCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) => ({
                              ...current,
                              [comment.id]: !current[comment.id],
                            }))
                          }
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 transition hover:text-indigo-900"
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                          {isExpanded
                            ? 'Ẩn câu trả lời'
                            : `Xem ${replyCount} câu trả lời`}
                        </button>
                      )}
                    </div>

                    {replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-indigo-200 pl-4">
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="flex gap-2.5"
                          >
                            <img
                              src={
                                reply.author.avatar ||
                                '/avatar-placeholder.png'
                              }
                              alt={reply.author.fullname}
                              className="h-8 w-8 shrink-0 rounded-full border border-white object-cover shadow-sm ring-1 ring-slate-200"
                            />

                            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-xs text-slate-950">
                                  {reply.author.fullname}
                                </strong>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {formatTime(reply.createdAt)}
                                </span>
                              </div>

                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-800">
                                {reply.content}
                              </p>

                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTo(comment);
                                  setReplyContent(
                                    `@${reply.author.fullname} `,
                                  );
                                }}
                                className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-700"
                              >
                                <Reply size={12} />
                                Trả lời
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {replyTo && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo-800">
              Trả lời <strong>{replyTo.author.fullname}</strong>
            </p>

            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setReplyContent('');
              }}
              className="rounded-full p-1.5 text-slate-600 hover:bg-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3">
            <textarea
              autoFocus
              value={replyContent}
              onChange={(event) =>
                setReplyContent(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submitReply();
                }
              }}
              rows={2}
              className="flex-1 resize-none rounded-2xl border-2 border-indigo-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <button
              type="button"
              onClick={() => void submitReply()}
              disabled={submitting || !replyContent.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Send size={19} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
