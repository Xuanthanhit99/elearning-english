'use client';

import {
  Headphones,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Option = {
  key: string;
  text: string;
  translation: string | null;
};

type Props = {
  audioUrl: string;
  prompt: string;
  options: Option[];
  selectedAnswer: string | null;
  disabled?: boolean;
  onSelectAnswer: (answer: string) => void;
};

export default function PlacementListeningQuestion({
  audioUrl,
  prompt,
  options,
  selectedAnswer,
  disabled = false,
  onSelectAnswer,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [audioError, setAudioError] = useState('');

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlayCount(0);
    setAudioError('');
  }, [audioUrl]);

  async function togglePlay() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      setAudioError('');

      if (audio.paused) {
        await audio.play();
        setPlaying(true);
        setPlayCount((value) => value + 1);
      } else {
        audio.pause();
        setPlaying(false);
      }
    } catch {
      setAudioError(
        'Không thể phát audio. Vui lòng kiểm tra kết nối hoặc thử lại.',
      );
    }
  }

  async function replay() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();

      setPlaying(true);
      setPlayCount((value) => value + 1);
      setAudioError('');
    } catch {
      setAudioError('Không thể phát lại audio.');
    }
  }

  function handleSeek(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const nextTime = Number(event.target.value);

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div>
      <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-violet-50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
            <Headphones className="h-10 w-10 text-orange-500" />
          </div>

          <h2 className="mt-4 text-xl font-black text-slate-950">
            Nghe đoạn hội thoại
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Bạn có thể nghe lại nếu chưa nghe rõ.
          </p>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget;

            setDuration(
              Number.isFinite(audio.duration)
                ? audio.duration
                : 0,
            );
          }}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime);
          }}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(duration);
          }}
          onError={() => {
            setPlaying(false);
            setAudioError(
              'Audio chưa sẵn sàng hoặc đường dẫn không hợp lệ.',
            );
          }}
          className="hidden"
        />

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600"
            >
              {playing ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="ml-0.5 h-6 w-6" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                className="w-full accent-orange-500"
              />

              <div className="mt-1 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{formatAudioTime(currentTime)}</span>
                <span>{formatAudioTime(duration)}</span>
              </div>
            </div>

            <Volume2 className="h-5 w-5 shrink-0 text-slate-400" />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => void replay()}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-100 px-4 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
            >
              <RotateCcw className="h-4 w-4" />
              Nghe lại
            </button>

            <span className="text-xs text-slate-500">
              Đã phát {playCount} lần
            </span>
          </div>
        </div>

        {audioError ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {audioError}
          </p>
        ) : null}
      </div>

      <h1 className="mt-7 max-w-3xl text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        {prompt}
      </h1>

      <div className="mt-7 space-y-3">
        {options.map((option) => {
          const active = selectedAnswer === option.text;

          return (
            <button
              type="button"
              key={option.key}
              disabled={disabled}
              onClick={() => onSelectAnswer(option.text)}
              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-400'
                  : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  active
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {active ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                ) : null}
              </span>

              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'bg-violet-50 text-slate-900'
                }`}
              >
                {option.key}
              </span>

              <span>
                <span className="block text-lg font-bold text-slate-900">
                  {option.text}
                </span>

                {option.translation ? (
                  <span className="mt-1 block text-sm text-slate-500">
                    {option.translation}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return '00:00';
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);

  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}