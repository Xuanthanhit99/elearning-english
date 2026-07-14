'use client';

import {
  File,
  Image,
  Paperclip,
  Send,
  Smile,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { communitySocket } from '@/src/lib/community-socket';
import {
  getCommunityConversations,
  getCommunityMessages,
  sendCommunityMessage,
  uploadCommunityFile,
} from '@/src/lib/community-social-api';
import type {
  CommunityConversationItem,
  CommunityMessageItem,
} from '@/src/types/community-social';

const emojis = ['😀', '😂', '😍', '🥰', '👍', '👏', '🔥', '❤️', '🎉', '🤔'];

export function CommunityMessagesView({
  initialConversationId,
}: {
  initialConversationId?: string | null;
}) {
  const [conversations, setConversations] = useState<
    CommunityConversationItem[]
  >([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<CommunityMessageItem[]>([]);
  const [content, setContent] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{
    type: 'IMAGE' | 'AUDIO' | 'FILE';
    url: string;
    name: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getCommunityConversations().then((items) => {
      setConversations(items);
      if (!activeId && items[0]) setActiveId(items[0].id);
    });
  }, []);

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  useEffect(() => {
    if (!activeId) return;

    void getCommunityMessages(activeId).then((result) =>
      setMessages(result.items),
    );

    communitySocket.emit('community:join-conversation', {
      conversationId: activeId,
    });

    const onMessage = (message: CommunityMessageItem) => {
      if (message.conversationId !== activeId) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
    };

    communitySocket.on('community:message-created', onMessage);

    return () => {
      communitySocket.emit('community:leave-conversation', {
        conversationId: activeId,
      });
      communitySocket.off('community:message-created', onMessage);
    };
  }, [activeId]);

  async function chooseFile(file: File) {
    try {
      setUploading(true);
      const uploaded = await uploadCommunityFile(file);
      setAttachment(uploaded);
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    if (!activeId) return;
    if (!content.trim() && !attachment) return;

    const message = await sendCommunityMessage(
      activeId,
      content.trim(),
      attachment
        ? {
            type: attachment.type,
            url: attachment.url,
            name: attachment.name,
          }
        : undefined,
    );

    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message],
    );

    setContent('');
    setAttachment(null);
    setEmojiOpen(false);
  }

  const active = conversations.find((item) => item.id === activeId);
  const activeUser = active?.members?.[0];

  return (
    <div className="grid min-h-[640px] overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-md md:grid-cols-[300px_1fr]">
      <aside className="border-r-2 border-slate-100">
        <div className="border-b-2 border-slate-100 p-4">
          <h2 className="text-lg font-extrabold text-slate-950">
            Tin nhắn
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {conversations.map((conversation) => {
            const user = conversation.members?.[0];

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className={`flex w-full gap-3 p-4 text-left transition ${
                  activeId === conversation.id
                    ? 'bg-indigo-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                <img
                  src={user?.avatar || '/avatar-placeholder.png'}
                  alt={user?.fullname || ''}
                  className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
                />

                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-slate-950">
                    {conversation.title ||
                      user?.fullname ||
                      'Cuộc trò chuyện'}
                  </strong>
                  <p className="mt-1 truncate text-sm font-medium text-slate-500">
                    {conversation.lastMessage?.content ||
                      'Chưa có tin nhắn'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b-2 border-slate-100 p-4">
          <img
            src={activeUser?.avatar || '/avatar-placeholder.png'}
            alt={activeUser?.fullname || ''}
            className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
          />
          <div>
            <strong className="block text-slate-950">
              {active?.title ||
                activeUser?.fullname ||
                'Chọn cuộc trò chuyện'}
            </strong>
            <span className="text-xs font-medium text-emerald-600">
              Đang hoạt động
            </span>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex max-w-[86%] gap-2.5"
            >
              <img
                src={
                  message.sender.avatar || '/avatar-placeholder.png'
                }
                alt={message.sender.fullname}
                className="h-8 w-8 rounded-full object-cover"
              />

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <strong className="text-xs text-indigo-700">
                  {message.sender.fullname}
                </strong>

                {message.content && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {message.content}
                  </p>
                )}

                {(message as any).media?.type === 'IMAGE' && (
                  <img
                    src={(message as any).media.url}
                    alt=""
                    className="mt-2 max-h-72 rounded-xl object-cover"
                  />
                )}

                {(message as any).media?.type === 'FILE' && (
                  <a
                    href={(message as any).media.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-indigo-700"
                  >
                    <File size={16} />
                    {(message as any).media.name || 'Tệp đính kèm'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="relative border-t-2 border-slate-100 bg-white p-4">
          {emojiOpen && (
            <div className="absolute bottom-24 left-4 z-20 grid grid-cols-5 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
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

          {attachment && (
            <div className="mb-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
              <div className="flex items-center gap-2">
                {attachment.type === 'IMAGE' ? (
                  <Image size={18} className="text-indigo-700" />
                ) : (
                  <File size={18} className="text-indigo-700" />
                )}
                <span className="text-sm font-semibold text-slate-800">
                  {attachment.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="rounded-full p-1 text-slate-600 hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setEmojiOpen((value) => !value)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
              title="Chọn emoji"
            >
              <Smile size={21} />
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              title="Đính kèm ảnh hoặc tệp"
            >
              <Paperclip size={21} />
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void chooseFile(file);
                event.currentTarget.value = '';
              }}
            />

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
              placeholder="Nhập tin nhắn..."
              className="min-h-[48px] flex-1 resize-none rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <button
              type="button"
              onClick={() => void send()}
              disabled={
                !activeId ||
                (!content.trim() && !attachment) ||
                uploading
              }
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
