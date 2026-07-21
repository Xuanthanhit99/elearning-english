// components/MiuChatModal/MiuChatWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/src/lib/axios';
import { PetStatus } from '@/src/types/chat';
import { MiuChatModal } from './MiuChatModal';

export default function MiuChatWidget() {
  const [pet, setPet] = useState<PetStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchPet = async () => {
      try {
        const res = await api.get('/pets/me');
        if (!active) return;
        setPet({
          name: res.data.isChosen ? res.data.petName : 'Linh thú',
          level: res.data.level || 1,
          streak: res.data.streak || 0,
          hp: res.data.hp ?? 100,
        });
      } catch (error) {
        console.error(error);
        if (active) setPet(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPet();
    window.addEventListener('pet-updated', fetchPet);
    return () => {
      active = false;
      window.removeEventListener('pet-updated', fetchPet);
    };
  }, []);

  if (loading || !pet) return null;

  if (open) {
    return <MiuChatModal initialPet={pet} onClose={() => setOpen(false)} />;
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Gọi linh thú đồng hành"
      className="group fixed bottom-4 right-4 z-[9000] flex h-16 w-16 items-center justify-center rounded-full bg-white text-4xl shadow-[0_20px_50px_rgba(31,42,68,0.25)] ring-4 ring-white transition hover:scale-105 sm:bottom-5 sm:right-5"
    >
      🐱
      {pet.streak > 0 && (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-black text-white shadow">
          {pet.streak}🔥
        </span>
      )}
    </button>
  );
}
