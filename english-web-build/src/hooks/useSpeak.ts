'use client';

import { useCallback, useRef, useState } from 'react';
import { synthesizeSpeech, TtsLang } from '../lib/tts-api';

/**
 * Phát âm dùng chung cho mọi nơi có nút loa (từ vựng, flashcard, bài
 * đọc, ngữ pháp, luyện phát âm...). Ưu tiên phát `audioUrl` có sẵn (vd.
 * dictionaryapi.dev); nếu rỗng thì gọi backend TTS (`/tts/speak`) để
 * tổng hợp giọng đọc, giữ đúng cách phát audio `new Audio(url).play()`
 * đã dùng sẵn trong VocabularyPage thay vì thêm cơ chế mới.
 */
export function useSpeak() {
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(
    async (
      key: string,
      text: string,
      audioUrl?: string | null,
      lang: TtsLang = 'en',
      rate = 1,
    ) => {
      if (speakingKey) return; // đang phát 1 audio khác, chặn spam click

      setError(null);
      setSpeakingKey(key);

      try {
        const url = audioUrl || (await synthesizeSpeech(text, lang));

        audioRef.current?.pause();
        const audio = new Audio(url);
        audio.playbackRate = rate;
        audioRef.current = audio;

        await new Promise<void>((resolve) => {
          audio.addEventListener('ended', () => resolve());
          audio.addEventListener('error', () => resolve());
          audio.play().catch(() => resolve());
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không phát được audio');
      } finally {
        setSpeakingKey((current) => (current === key ? null : current));
      }
    },
    [speakingKey],
  );

  return {
    speak,
    error,
    speakingKey,
    isSpeaking: (key: string) => speakingKey === key,
  };
}
