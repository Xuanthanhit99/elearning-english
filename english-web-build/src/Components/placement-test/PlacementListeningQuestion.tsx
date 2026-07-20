"use client";

import { Headphones, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { PlacementOption } from "@/src/lib/placement-api";
import PlacementTextQuestion from "./PlacementTextQuestion";

type Props = {
  audioUrl: string;
  prompt: string;
  options: PlacementOption[];
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
  const [audioError, setAudioError] = useState("");

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      setAudioError("");
      if (audio.paused) {
        await audio.play();
        setPlaying(true);
        setPlayCount((value) => value + 1);
      } else {
        audio.pause();
        setPlaying(false);
      }
    } catch {
      setAudioError("Audio could not be played. Check your connection and try again.");
    }
  }

  async function replay() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = 0;
      await audio.play();
      setPlaying(true);
      setPlayCount((value) => value + 1);
      setAudioError("");
    } catch {
      setAudioError("Audio replay failed. Please try again.");
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div>
      <section className="rounded-3xl border border-orange-100 bg-orange-50/55 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
            <Headphones aria-hidden className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-slate-950">
              Listen carefully
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Play the audio, then answer the question below. Transcript is not
              shown unless the backend provides it in the question prompt.
            </p>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget;
            setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(duration);
          }}
          onError={() => {
            setPlaying(false);
            setAudioError("Audio is unavailable or the URL is invalid.");
          }}
          className="hidden"
        />

        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void togglePlay()}
              disabled={disabled}
              aria-label={playing ? "Pause audio" : "Play audio"}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-60"
            >
              {playing ? <Pause aria-hidden className="h-6 w-6" /> : <Play aria-hidden className="ml-0.5 h-6 w-6" />}
            </button>

            <div className="min-w-0 flex-1">
              <input
                type="range"
                aria-label="Audio progress"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                disabled={disabled || duration === 0}
                className="w-full accent-orange-500 disabled:opacity-50"
              />
              <div className="mt-1 flex justify-between text-xs font-bold text-slate-500">
                <span>{formatAudioTime(currentTime)}</span>
                <span>{formatAudioTime(duration)}</span>
              </div>
            </div>

            <Volume2 aria-hidden className="hidden h-5 w-5 shrink-0 text-slate-400 sm:block" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void replay()}
              disabled={disabled}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-orange-100 px-4 py-2 text-sm font-black text-orange-700 transition hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-60"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Replay
            </button>
            <span className="text-xs font-bold text-slate-500">
              Played {playCount} time{playCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {audioError ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600" role="alert">
            {audioError}
          </p>
        ) : null}
      </section>

      <div className="mt-7">
        <PlacementTextQuestion
          prompt={prompt}
          passage={null}
          options={options}
          selectedAnswer={selectedAnswer}
          disabled={disabled}
          questionType="MULTIPLE_CHOICE"
          onSelectAnswer={(answer) => {
            if (answer) onSelectAnswer(answer);
          }}
        />
      </div>
    </div>
  );
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
