// src/hooks/useAudioProcessor.ts

import { useRef, useState, useCallback } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import type { RealtimeClient } from '@openai/realtime-api-beta';

export function useAudioProcessor() {
  // Direct port of audio-related state from ConsolePage
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Direct port of audio recording functions
  const startRecording = useCallback(async (client: RealtimeClient) => {
    if (!client) return;

    setIsRecording(true);
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record(data => client.appendInputAudio(data.mono));
  }, []);

  const stopRecording = useCallback(async (client: RealtimeClient) => {
    if (!client) return;

    setIsRecording(false);
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  }, []);

  const changeTurnEndType = useCallback(
    async (value: string, client: RealtimeClient) => {
      if (!client) return;

      const wavRecorder = wavRecorderRef.current;
      if (value === 'none' && wavRecorder.getStatus() === 'recording') {
        await wavRecorder.pause();
      }
      client.updateSession({
        turn_detection: value === 'none' ? null : { type: 'server_vad' },
      });
      if (value === 'server_vad' && client.isConnected()) {
        await wavRecorder.record(data => client.appendInputAudio(data.mono));
      }
      setCanPushToTalk(value === 'none');
    },
    []
  );

  // Audio setup/cleanup functions
  const setupAudio = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    await wavRecorder.begin();
    await wavStreamPlayer.connect();
  }, []);

  const cleanupAudio = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    await wavRecorder.end();
    wavStreamPlayer.interrupt();
  }, []);

  return {
    wavRecorderRef,
    wavStreamPlayerRef,
    isRecording,
    canPushToTalk,
    startRecording,
    stopRecording,
    changeTurnEndType,
    setupAudio,
    cleanupAudio,
  };
}
