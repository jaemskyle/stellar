/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import type { RealtimeClient } from '@openai/realtime-api-beta';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import type { RealtimeEvent, MemoryKV } from '@/types/console';
import type { WavStreamPlayer } from '@/lib/wavtools';
import type { StudyInfo } from '@/lib/ctg-tool';
import { reportHandler } from '@/lib/report-handler';

interface UseConnectionManagerProps {
  clientRef: React.MutableRefObject<RealtimeClient | null>;
  setIsConnected: (value: boolean) => void;
  setRealtimeEvents: React.Dispatch<React.SetStateAction<RealtimeEvent[]>>;
  setItems: React.Dispatch<React.SetStateAction<ItemType[]>>;
  setFinalReport: React.Dispatch<React.SetStateAction<any>>;
  startTimeRef: React.MutableRefObject<string>;
  wavStreamPlayerRef: React.MutableRefObject<WavStreamPlayer>;
  addTools: () => void;
  setupEventHandlers: (
    wavPlayer: WavStreamPlayer,
    setEvents: any,
    setItems: any
  ) => void;
  setupAudio: () => Promise<void>;
  cleanupAudio: () => Promise<void>;
  setMemoryKv: React.Dispatch<React.SetStateAction<MemoryKV>>;
  setTrials: React.Dispatch<React.SetStateAction<StudyInfo[]>>;
  setIsLoadingTrials: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useConnectionManager({
  clientRef,
  setIsConnected,
  setRealtimeEvents,
  setItems,
  setFinalReport,
  startTimeRef,
  wavStreamPlayerRef,
  addTools,
  setupEventHandlers,
  setupAudio,
  cleanupAudio,
  setMemoryKv,
  setTrials,
  setIsLoadingTrials,
}: UseConnectionManagerProps) {
  const connectConversation = useCallback(async () => {
    try {
      if (!clientRef.current) return;

      // Initialize state
      startTimeRef.current = new Date().toISOString();
      setIsConnected(true);
      setRealtimeEvents([]);
      setItems(clientRef.current.conversation.getItems());

      // Set up tools if not already done
      if (Object.keys(clientRef.current.tools).length === 0) {
        addTools();
        clientRef.current.updateSession();
      }

      // Set up event handlers
      setupEventHandlers(
        wavStreamPlayerRef.current,
        setRealtimeEvents,
        setItems
      );

      // Connect audio and client
      await setupAudio();
      await clientRef.current.connect();
      clientRef.current.createResponse();
    } catch (error) {
      console.error('Failed to connect:', error);
      // Reset state on connection failure
      setIsConnected(false);
      setRealtimeEvents([]);
      setItems([]);
    }
  }, [
    clientRef,
    setupAudio,
    setIsConnected,
    addTools,
    setupEventHandlers,
    wavStreamPlayerRef,
    setItems,
    setRealtimeEvents,
    startTimeRef, // Add missing dependency
  ]);

  const disconnectConversation = useCallback(async () => {
    if (!clientRef.current) return;

    // Add missing state cleanup
    setMemoryKv({});
    setTrials([]);
    setIsLoadingTrials(false);

    // Reset state
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);

    // Disconnect client and audio
    clientRef.current?.disconnect();
    await cleanupAudio();
  }, [
    clientRef,
    cleanupAudio,
    setIsConnected,
    setItems,
    setRealtimeEvents,
    setMemoryKv,
    setTrials,
    setIsLoadingTrials,
  ]); // Add missing dependencies

  const fullCleanup = useCallback(async () => {
    await disconnectConversation();
    setFinalReport(null);
    reportHandler.clear();
  }, [disconnectConversation, setFinalReport]); // Add missing dependency

  // Add missing session update handler
  const updateSession = useCallback(async () => {
    if (!clientRef.current) return;
    await clientRef.current.updateSession({
      turn_detection: null,
      input_audio_transcription: { model: 'whisper-1' },
    });
  }, [clientRef]);

  return {
    connectConversation,
    disconnectConversation,
    fullCleanup,
    updateSession,
  };
}
