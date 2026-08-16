import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { resolveListeningAudioUrl } from '../utils/listening-utils';

export function useListeningAudio(audioUrl?: string | null) {
  const [speed, setSpeedState] = useState(1);
  const [playCount, setPlayCount] = useState(0);
  const [manualError, setManualError] = useState<string | null>(null);
  const resolvedUrl = useMemo(() => resolveListeningAudioUrl(audioUrl), [audioUrl]);
  const source = useMemo(() => (resolvedUrl ? { uri: resolvedUrl } : null), [resolvedUrl]);
  const player = useAudioPlayer(source, {
    updateInterval: 250,
    preferredForwardBufferDuration: 8,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  }, []);

  useEffect(() => {
    player.pause();
    setPlayCount(0);
    setManualError(null);
  }, [player, resolvedUrl]);

  useEffect(() => {
    player.setPlaybackRate(speed, 'medium');
  }, [player, speed]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        player.pause();
        void setIsAudioActiveAsync(false);
      } else {
        void setIsAudioActiveAsync(true);
      }
    });

    return () => {
      subscription.remove();
      player.pause();
    };
  }, [player]);

  function play() {
    if (!resolvedUrl) {
      setManualError('Audio chua san sang.');
      return;
    }

    setManualError(null);
    setPlayCount((count) => count + 1);
    player.play();
  }

  function pause() {
    player.pause();
  }

  async function replay() {
    if (!resolvedUrl) {
      setManualError('Audio chua san sang.');
      return;
    }

    setManualError(null);
    await player.seekTo(0);
    setPlayCount((count) => count + 1);
    player.play();
  }

  async function seekBy(deltaSeconds: number) {
    if (!status.isLoaded) return;
    const next = Math.max(0, Math.min(status.duration || Number.MAX_SAFE_INTEGER, status.currentTime + deltaSeconds));
    await player.seekTo(next);
  }

  function setSpeed(nextSpeed: number) {
    setSpeedState(nextSpeed);
  }

  return {
    duration: status.duration,
    error: manualError ?? status.error,
    isBuffering: status.isBuffering,
    isLoaded: status.isLoaded,
    isPlaying: status.playing,
    play,
    playCount,
    position: status.currentTime,
    pause,
    replay,
    resolvedUrl,
    seekBy,
    setSpeed,
    speed,
  };
}
