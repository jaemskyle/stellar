// src/hooks/useAudioProcessor.ts

import { useRef, useState, useCallback, useEffect } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import type { RealtimeClient } from '@openai/realtime-api-beta';
import type { AudioProcessingEvents } from '@/types/console';

export interface UseAudioProcessorOptions {
  clientRef: React.MutableRefObject<RealtimeClient | null>;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onAudioProcessingEvent?: (_event: AudioProcessingEvents) => void;
}

export function useAudioProcessor({
  clientRef,
  onStartRecording,
  onStopRecording,
  onAudioProcessingEvent,
}: UseAudioProcessorOptions) {
  // Direct port of audio state from ConsolePageOG
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Add missing audio state tracking
  const [audioState, setAudioState] = useState<'idle' | 'recording' | 'error'>(
    'idle'
  );

  // Add VAD mode tracking
  const [turnEndType, setTurnEndType] = useState<'none' | 'server_vad'>('none');

  // Add initialization effect
  useEffect(() => {
    if (!wavRecorderRef.current || !wavStreamPlayerRef.current) {
      console.warn('Audio devices not initialized');
      return;
    }

    // Match original initialization
    wavRecorderRef.current = new WavRecorder({ sampleRate: 24000 });
    wavStreamPlayerRef.current = new WavStreamPlayer({ sampleRate: 24000 });
  }, []);

  // Audio recording functions - exact port from ConsolePageOG
  const startRecording = useCallback(async () => {
    if (!clientRef.current) return;

    setIsRecording(true);
    onAudioProcessingEvent?.('start');
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    const trackSampleOffset = wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      client.cancelResponse(trackId, offset);
    }

    await wavRecorder.record(data => client.appendInputAudio(data.mono));
    onStartRecording?.();
  }, [clientRef, onStartRecording, onAudioProcessingEvent]);

  const stopRecording = useCallback(async () => {
    if (!clientRef.current) return;

    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
    onStopRecording?.();
  }, [clientRef, onStopRecording]);

  const changeTurnEndType = useCallback(
    async (value: string) => {
      if (!clientRef.current) return;

      const client = clientRef.current;
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
      setTurnEndType(value as 'none' | 'server_vad');
      onAudioProcessingEvent?.('vad_change');
    },
    [clientRef, onAudioProcessingEvent]
  );

  // Add error handling
  const handleAudioError = useCallback(
    (error: Error) => {
      console.error('Audio processing error:', error);
      setAudioState('error');
      onAudioProcessingEvent?.('error');
    },
    [onAudioProcessingEvent]
  );

  // Setup and cleanup functions - matched to ConsolePageOG connection logic
  const setupAudio = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Connect to microphone and audio output - exact sequence from ConsolePageOG
    await wavRecorder.begin();
    await wavStreamPlayer.connect();

    // Handle server VAD mode if active
    if (clientRef.current?.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record(data =>
        clientRef.current?.appendInputAudio(data.mono)
      );
    }
  }, [clientRef]);

  const cleanupAudio = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    await wavRecorder.end();
    wavStreamPlayer.interrupt();
  }, []);

  return {
    // Refs
    wavRecorderRef,
    wavStreamPlayerRef,

    // State
    isRecording,
    canPushToTalk,
    audioState,
    turnEndType,

    // Core functions
    startRecording,
    stopRecording,
    changeTurnEndType,
    setupAudio,
    cleanupAudio,
    handleAudioError,

    isAudioInitialized:
      !!wavRecorderRef.current && !!wavStreamPlayerRef.current,
  };
}
