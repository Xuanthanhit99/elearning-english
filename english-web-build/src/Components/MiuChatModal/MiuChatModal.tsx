// components/miu-chat/MiuChatModal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { PetStatus, QuickActionKey } from '@/src/types/chat';
import { useMiuChat } from '@/src/hooks/useMiuChat';
// import { useMiuChat, PetStatus, QuickActionKey } from '@/src/hooks/useMiuChat';

const QUICK_ACTIONS: { key: QuickActionKey; label: string }[] = [
  { key: 'CHEER_UP', label: 'Động viên mình' },
  { key: 'BANTER', label: 'Nghịch một chút' },
  { key: 'QUICK_TIP', label: 'Gợi ý học nhanh' },
];

export function MiuChatModal({
  initialPet,
  onClose,
}: {
  initialPet: PetStatus;
  onClose: () => void;
}) {
  const { messages, pet, loading, send } = useMiuChat(initialPet);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  console.log("input", input);

  const handleSend = () => {
    console.log("fdasd")
    if (!input.trim() || loading) return;
    send({ content: input.trim() });
    setInput('');
  };

  return (
      <div className="fixed bottom-4 right-4 z-[9000] sm:bottom-5 sm:right-5">
  <div className="relative z-10 flex w-full max-w-3xl overflow-hidden rounded-3xl shadow-2xl">

        {/* LEFT PANEL — linh thú */}
        <div className="relative flex w-[260px] shrink-0 flex-col items-center bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-10 text-white">
          <div className="relative">
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100 to-orange-200 shadow-lg">
              <span className="text-6xl">🐱</span>
            </div>
            <span className="absolute -top-1 right-1 h-4 w-4 rounded-full border-2 border-slate-900 bg-orange-400" />
          </div>

          <p className="mt-3 text-xs text-slate-400">Lv {pet.level} · Ấu linh</p>
          <h3 className="mt-1 text-xl font-bold">{pet.name}</h3>
          <p className="mt-1 text-xs text-slate-400">
            Lv {pet.level} · Streak {pet.streak} ngày · HP {pet.hp}/100
          </p>

          <button className="mt-8 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold hover:bg-orange-600 transition">
            Chăm sóc linh thú
          </button>
        </div>

        {/* RIGHT PANEL — chat */}
        <div className="flex flex-1 flex-col bg-gradient-to-b from-white to-orange-50">
          <div className="flex items-start justify-between px-6 pt-6">
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                <Sparkles size={14} /> GÓC TRÒ CHUYỆN
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-800">Gọi linh thú động viên bạn</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 px-6 pt-4">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.key}
                disabled={loading}
                onClick={() => send({ quickAction: a.key })}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50 transition"
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'USER' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'USER'
                      ? 'max-w-[75%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-2.5 text-sm text-white'
                      : 'max-w-[75%] rounded-2xl rounded-tl-sm border border-orange-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm border border-orange-100 bg-white px-4 py-2.5 text-sm text-slate-400">
                  Miu đang gõ...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-orange-100 px-6 py-4 z-[9999]">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Nói gì đó với linh thú..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-300"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}