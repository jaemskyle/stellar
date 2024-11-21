/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import type { RealtimeClient } from '@openai/realtime-api-beta';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import type { RealtimeEvent } from '@/types/console';
import type { WavStreamPlayer } from '@/lib/wavtools';
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
}: UseConnectionManagerProps) {
  const connectConversation = useCallback(async () => {
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
    setupEventHandlers(wavStreamPlayerRef.current, setRealtimeEvents, setItems);

    // Connect audio and client
    await setupAudio();
    await clientRef.current.connect();
    clientRef.current.createResponse();
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

    // Reset state
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);

    // Disconnect client and audio
    clientRef.current?.disconnect();
    await cleanupAudio();
  }, [clientRef, cleanupAudio, setIsConnected, setItems, setRealtimeEvents]); // Add missing dependencies

  const fullCleanup = useCallback(async () => {
    await disconnectConversation();
    setFinalReport(null);
    reportHandler.clear();
  }, [disconnectConversation, setFinalReport]); // Add missing dependency

  return {
    connectConversation,
    disconnectConversation,
    fullCleanup,
  };
}
