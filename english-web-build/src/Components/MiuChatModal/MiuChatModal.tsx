// components/miu-chat/MiuChatModal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Crown } from 'lucide-react';
import { PetStatus, QuickActionKey } from '@/src/types/chat';
import { useMiuChat } from '@/src/hooks/useMiuChat';
import { useAuthStore } from '@/src/store/authStore';

const QUICK_ACTIONS: { key: QuickActionKey; label: string }[] = [
  { key: 'CHEER_UP', label: '💪 Động viên mình' },
  { key: 'BANTER', label: '😹 Nghịch một chút' },
  { key: 'QUICK_TIP', label: '💡 Gợi ý học nhanh' },
];

export function MiuChatModal({
  initialPet,
  onClose,
}: {
  initialPet: PetStatus;
  onClose: () => void;
}) {
  const { messages, pet, loading, send } = useMiuChat(initialPet);
  const user = useAuthStore(state => state.user);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    send({ content: input.trim() });
    setInput('');
  };

  const initials = (user?.fullname || 'B')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed bottom-4 right-4 z-[9000] sm:bottom-5 sm:right-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex w-full max-w-3xl overflow-hidden rounded-[28px] border border-black/5 shadow-[0_30px_80px_rgba(15,23,42,0.35)]">

        {/* LEFT PANEL — thông tin người dùng */}
        <div className="relative flex w-[260px] shrink-0 flex-col items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 px-6 py-10 text-white">
          <div className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />

          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullname}
                className="h-28 w-28 rounded-3xl object-cover shadow-lg ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-300 to-amber-500 text-3xl font-black text-white shadow-lg ring-2 ring-white/10">
                {initials}
              </div>
            )}
            {user?.isPro && (
              <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-slate-900 shadow">
                <Crown size={11} /> PRO
              </span>
            )}
          </div>

          <h3 className="mt-5 text-center text-lg font-bold leading-tight">
            {user?.fullname || 'Bạn học viên'}
          </h3>
          {user?.email && (
            <p className="mt-1 truncate text-center text-xs text-slate-400 max-w-full">{user.email}</p>
          )}

          <div className="mt-5 grid w-full grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/5 px-2 py-2.5 ring-1 ring-white/10">
              <p className="text-base font-black text-orange-400">Lv {user?.level ?? 1}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">Cấp độ</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-2 py-2.5 ring-1 ring-white/10">
              <p className="text-base font-black text-sky-400">{user?.xp ?? 0}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">XP</p>
            </div>
          </div>

          <div className="mt-4 flex w-full items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
            <span className="text-2xl leading-none">🐱</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">{pet.name}</p>
              <p className="truncate text-[10px] text-slate-400">Lv {pet.level} · 🔥{pet.streak} · HP {pet.hp}/100</p>
            </div>
          </div>

          <button className="mt-6 w-full rounded-full bg-orange-500 py-2.5 text-sm font-semibold shadow-lg shadow-orange-950/30 transition hover:bg-orange-600">
            Chăm sóc linh thú
          </button>
        </div>

        {/* RIGHT PANEL — chat */}
        <div className="flex flex-1 flex-col bg-gradient-to-b from-white to-orange-50/60">
          <div className="flex items-start justify-between border-b border-orange-100/80 px-6 py-5">
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold tracking-wide text-orange-500">
                <Sparkles size={14} /> GÓC TRÒ CHUYỆN
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-800">Gọi linh thú động viên bạn</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
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
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:shadow disabled:opacity-50 disabled:hover:translate-y-0"
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
                      ? 'max-w-[75%] rounded-2xl rounded-tr-sm bg-slate-900 px-4 py-2.5 text-sm text-white shadow-sm'
                      : 'max-w-[75%] rounded-2xl rounded-tl-sm border border-orange-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-orange-100 bg-white px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-300 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-300 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-300" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-orange-100/80 px-6 py-4">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Nói gì đó với linh thú..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              Gửi <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
