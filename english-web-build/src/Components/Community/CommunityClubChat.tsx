"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getClubMessages,
  sendClubMessage,
} from "@/src/lib/community-club-api";
import type { ClubMessage } from "@/src/types/community-club";

function messageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function CommunityClubChat({ clubId }: { clubId: string }) {
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadMessages() {
    try {
      setLoading(true);
      const result = await getClubMessages(clubId);
      setMessages(result.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, [clubId]);

  async function submit() {
    const value = content.trim();
    if (!value || sending) return;

    try {
      setSending(true);
      const created = await sendClubMessage(clubId, value);
      setMessages((current) => [...current, created]);
      setContent("");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-xl font-extrabold text-slate-950">Chat nhóm</h2>
        <p className="text-sm font-semibold text-slate-500">
          Trò chuyện với các thành viên trong câu lạc bộ.
        </p>
      </div>

      <div className="max-h-[520px] min-h-[320px] space-y-4 overflow-y-auto bg-slate-50 p-5">
        {loading ? (
          <div className="flex h-60 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 animate-spin text-indigo-600" />
            Đang tải tin nhắn...
          </div>
        ) : messages.length ? (
          messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-100 font-extrabold text-indigo-700">
                {message.sender.avatar ? (
                  <img src={message.sender.avatar} alt={message.sender.fullname} className="h-full w-full object-cover" />
                ) : (
                  message.sender.fullname.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1 rounded-2xl bg-white p-3 shadow-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-extrabold text-slate-950">{message.sender.fullname}</p>
                  <span className="text-xs font-semibold text-slate-400">{messageTime(message.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm font-semibold text-slate-700">{message.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-60 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center font-semibold text-slate-500">
            Chưa có tin nhắn nào. Hãy mở lời cho câu lạc bộ nhé.
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-slate-100 p-4">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={2}
          placeholder="Nhập tin nhắn..."
          className="min-h-12 flex-1 resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none focus:border-indigo-400"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={sending || !content.trim()}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label="Gửi tin nhắn"
        >
          {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </section>
  );
}
