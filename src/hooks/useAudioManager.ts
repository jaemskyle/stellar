import { useCallback, useRef, useState } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';
import { logger } from '@/utils/logger';
import { RealtimeClient } from '@openai/realtime-api-beta';

interface UseAudioManagerProps {
  client: RealtimeClient | null;
  activeResponseId: string | null;
}

interface UseAudioManagerReturn {
  isRecording: boolean;
  canPushToTalk: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetAudioState: () => Promise<void>;
  initializeAudio: () => Promise<void>;
  changeTurnEndType: (value: string) => Promise<void>;
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
}

/**
 * Custom hook for managing audio recording and playback functionality
 * Handles recording state, push-to-talk functionality, and audio stream management
 * WavRecorder takes speech input, WavStreamPlayer output, client is API client
 */
export function useAudioManager({
  client,
  activeResponseId,
}: UseAudioManagerProps): UseAudioManagerReturn {
  /**
   * Instantiate audio state:
   * - WavRecorder (speech input)
   * - WavStreamPlayer (speech output)
   * - RealtimeClient (API client)
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  /**
   * Initialize audio devices
   * Connects to microphone and audio output
   */
  const initializeAudio = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    if (!wavRecorder || !wavStreamPlayer) return;

    // Connect to microphone
    logger.debug(
      'DEBUG: Initializing audio recorder (wavRecorder) asynchronously'
    );
    await wavRecorder.begin();

    // Connect to audio output
    logger.debug(
      'DEBUG: Initializing audio stream player (wavStreamPlayer) asynchronously'
    );
    await wavStreamPlayer.connect();
  }, []);

  /**
   * Start recording audio input
   */
  const startRecording = useCallback(async () => {
    if (!client) return;

    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    if (!wavRecorder || !wavStreamPlayer) return;

    setIsRecording(true);

    const trackSampleOffset = wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      client.cancelResponse(trackId, offset);
    }

    await wavRecorder.record(data => client.appendInputAudio(data.mono));
  }, [client]);

  /**
   * Stop recording audio input
   */
  const stopRecording = useCallback(async () => {
    logger.debug('Stopping recording. Current isRecording: ', isRecording);
    if (!client || !isRecording) return;

    const wavRecorder = wavRecorderRef.current;
    if (!wavRecorder) return;

    setIsRecording(false);
    await wavRecorder.pause();

    // Only create response if no active response
    if (!activeResponseId) {
      client.createResponse();
    } else {
      logger.warn(
        'Skipping response creation - active response exists:',
        activeResponseId
      );
    }
    logger.debug('Recording stopped');
  }, [client, isRecording, activeResponseId]);

  /**
   * Switch between Manual <> VAD mode for communication
   * Handles turn detection type changes
   */
  const changeTurnEndType = useCallback(
    async (value: string) => {
      if (!client) return;

      const wavRecorder = wavRecorderRef.current;
      if (!wavRecorder) return;

      if (value === 'none' && wavRecorder.getStatus() === 'recording') {
        await wavRecorder.pause();
      }

      client.updateSession({
        turn_detection: value === 'none' ? null : { type: 'server_vad' },
      });

      if (value === 'server_vad' && client.isConnected()) {
        await wavRecorder.record(data => client.appendInputAudio(data.mono));
      }

      // Note: This was commented out in MainPage.tsx with a question about whether it's needed
      // setCanPushToTalk(value === 'none');
    },
    [client]
  );

  /**
   * Reset all audio-related state and stop any ongoing recording/playback
   */
  const resetAudioState = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    if (wavRecorder) {
      await wavRecorder.end();
    }

    if (wavStreamPlayer) {
      wavStreamPlayer.interrupt();
    }

    setIsRecording(false);
    setCanPushToTalk(true);
  }, []);

  return {
    isRecording,
    canPushToTalk,
    startRecording,
    stopRecording,
    resetAudioState,
    initializeAudio,
    changeTurnEndType,
    wavRecorderRef,
    wavStreamPlayerRef,
  };
}
