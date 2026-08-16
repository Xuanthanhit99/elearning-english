import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';

export function usePlacementRecording() {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(() => (recordingUri ? { uri: recordingUri } : null), [recordingUri]);
  const player = useAudioPlayer(source);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    return () => {
      player.pause();
      if (recorder.isRecording) {
        void recorder.stop();
      }
      void setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
    };
  }, [player, recorder]);

  async function start() {
    try {
      setError(null);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Ung dung chua co quyen dung micro.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      setRecordingUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chua the bat dau ghi am.');
    }
  }

  async function stop() {
    try {
      setError(null);
      await recorder.stop();
      setRecordingUri(recorder.uri ?? null);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chua the dung ghi am.');
    }
  }

  async function play() {
    if (!recordingUri) return;
    await player.seekTo(0);
    player.play();
  }

  function reset() {
    player.pause();
    setRecordingUri(null);
    setError(null);
  }

  return {
    durationSeconds: Math.round((recorderState.durationMillis ?? 0) / 1000),
    error,
    isPlaying: playerStatus.playing,
    isRecording: recorderState.isRecording,
    play,
    recordingUri,
    reset,
    start,
    stop,
  };
}
