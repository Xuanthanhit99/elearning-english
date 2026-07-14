'use client';

import { Send, Smile } from 'lucide-react';
import { useEffect, useState } from 'react';
import { communitySocket } from '@/src/lib/community-socket';
import {
  getClubMessages,
  sendClubMessage,
} from '@/src/lib/community-club-api';
import type { ClubMessage } from '@/src/types/community-club';

const emojis = ['😀', '😂', '😍', '👍', '👏', '🔥', '❤️', '🎉'];

export function CommunityClubChat({
  clubId,
}: {
  clubId: string;
}) {
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [content, setContent] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    void getClubMessages(clubId).then((result) =>
      setMessages(result.items),
    );

    communitySocket.emit('community:club-join-room', {
      clubId,
    });

    const onMessage = (message: ClubMessage) => {
      if (message.clubId !== clubId) return;

      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
    };

    const onTyping = (payload: {
      clubId: string;
      fullname: string;
      typing: boolean;
    }) => {
      if (payload.clubId !== clubId) return;

      setTypingUsers((current) => {
        if (payload.typing) {
          return current.includes(payload.fullname)
            ? current
            : [...current, payload.fullname];
        }

        return current.filter((name) => name !== payload.fullname);
      });
    };

    communitySocket.on(
      'community:club-message-created',
      onMessage,
    );
    communitySocket.on('community:club-typing', onTyping);

    return () => {
      communitySocket.emit('community:club-leave-room', {
        clubId,
      });
      communitySocket.off(
        'community:club-message-created',
        onMessage,
      );
      communitySocket.off('community:club-typing', onTyping);
    };
  }, [clubId]);

  async function send() {
    const value = content.trim();
    if (!value) return;

    const message = await sendClubMessage(clubId, value);

    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message],
    );

    setContent('');
    setEmojiOpen(false);
  }

  return (
    <div className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="border-b-2 border-slate-100 px-5 py-4">
        <h3 className="font-extrabold text-slate-950">
          Chat nhóm
        </h3>
        <p className="text-sm text-slate-500">
          Chỉ thành viên câu lạc bộ mới có thể nhắn tin.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex max-w-[88%] gap-3"
          >
            <img
              src={
                message.sender.avatar ||
                '/avatar-placeholder.png'
              }
              alt={message.sender.fullname}
              className="h-9 w-9 rounded-full object-cover"
            />

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <strong className="text-xs text-indigo-700">
                {message.sender.fullname}
              </strong>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {typingUsers.length > 0 && (
          <p className="text-xs font-medium text-slate-500">
            {typingUsers.join(', ')} đang nhập...
          </p>
        )}
      </div>

      <div className="relative border-t-2 border-slate-100 p-4">
        {emojiOpen && (
          <div className="absolute bottom-20 left-4 grid grid-cols-4 gap-2 rounded-2xl border bg-white p-3 shadow-xl">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  setContent((current) => current + emoji)
                }
                className="grid h-9 w-9 place-items-center rounded-lg text-xl hover:bg-slate-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEmojiOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <Smile size={20} />
          </button>

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Nhắn tin cho câu lạc bộ..."
            className="flex-1 resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />

          <button
            type="button"
            onClick={() => void send()}
            disabled={!content.trim()}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white disabled:opacity-40"
          >
            <Send size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
