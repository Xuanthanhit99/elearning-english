'use client';

import { useCallback, useRef, useState } from 'react';
import { synthesizeSpeech, TtsLang } from '../lib/tts-api';

/**
 * PhÃ¡t Ã¢m dÃ¹ng chung cho má»i nÆ¡i cÃ³ nÃºt loa (tá»« vá»±ng, flashcard, bÃ i
 * Ä‘á»c, ngá»¯ phÃ¡p, luyá»‡n phÃ¡t Ã¢m...). Æ¯u tiÃªn phÃ¡t `audioUrl` cÃ³ sáºµn (vd.
 * dictionaryapi.dev); náº¿u rá»—ng thÃ¬ gá»i backend TTS (`/tts/speak`) Ä‘á»ƒ
 * tá»•ng há»£p giá»ng Ä‘á»c, giá»¯ Ä‘Ãºng cÃ¡ch phÃ¡t audio `new Audio(url).play()`
 * Ä‘Ã£ dÃ¹ng sáºµn trong VocabularyPage thay vÃ¬ thÃªm cÆ¡ cháº¿ má»›i.
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
      if (speakingKey) return; // Ä‘ang phÃ¡t 1 audio khÃ¡c, cháº·n spam click

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
        setError(err instanceof Error ? err.message : 'KhÃ´ng phÃ¡t Ä‘Æ°á»£c audio');
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
