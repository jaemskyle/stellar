// src/components/ConsolePage.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { useOpenAIClient } from '@/hooks/useOpenAIClient';
import { useAudioProcessor } from '@/hooks/useAudioProcessor';
import { formatTime } from '@/utils/timeUtils';
import { ConversationDisplay } from './console/ConversationDisplay';
import { EventLog } from './console/EventLog';
import { Button } from './button/Button';
import { reportHandler } from '@/lib/report-handler';
import { ConsoleLayout } from './console/ConsoleLayout';
import { ControlPanel } from './console/ControlPanel';
import { SidePanel } from './console/SidePanel';
import ReportModal from './ReportModal'; // Fix import
import type { ConsoleProps } from '@/types/console';
import { useEventHandling } from '@/hooks/useEventHandling';
import { useConnectionManager } from '@/hooks/useConnectionManager';
import './ConsolePage.scss';

const LOCAL_RELAY_SERVER_URL =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

export function ConsolePage({
  apiKey: initialApiKey,
  onResetApiKey,
}: ConsoleProps) {
  // Initialize client and its state
  const {
    clientRef,
    isConnected,
    setIsConnected,
    resetAPIKey: defaultResetApiKey,
    addTools,
    setupEventHandlers,
    memoryKv,
    setMemoryKv, // Add missing setter
    trials,
    setTrials, // Add missing setter
    isLoadingTrials,
    setIsLoadingTrials, // Add missing setter
    finalReport,
    setFinalReport,
    isReportModalOpen,
    setIsReportModalOpen,
  } = useOpenAIClient(initialApiKey);

  // Event handling
  const {
    realtimeEvents,
    expandedEvents,
    handleEventClick,
    addEvent,
    setRealtimeEvents,
  } = useEventHandling();

  // Initialize audio processor
  const {
    wavRecorderRef,
    wavStreamPlayerRef,
    isRecording,
    canPushToTalk,
    startRecording,
    stopRecording,
    changeTurnEndType,
    setupAudio,
    cleanupAudio,
  } = useAudioProcessor({
    clientRef,
    onStartRecording: () => {
      addEvent({
        source: 'client',
        event: { type: 'audio.recording.start' },
      });
    },
    onStopRecording: () => {
      addEvent({
        source: 'client',
        event: { type: 'audio.recording.stop' },
      });
    },
  });

  // Conversation and event state - managed locally as they're UI-specific
  const [items, setItems] = useState<ItemType[]>([]);

  // References
  const startTimeRef = useRef<string>(new Date().toISOString());
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const eventsScrollHeightRef = useRef(0);

  const handleDeleteConversationItem = useCallback(
    async (id: string) => {
      if (!clientRef.current) return;
      clientRef.current.deleteItem(id);
    },
    [clientRef]
  );

  // Move connection logic to custom hook
  const { connectConversation, disconnectConversation, fullCleanup } =
    useConnectionManager({
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
      // Add missing props
      setMemoryKv,
      setTrials,
      setIsLoadingTrials,
    });

  // Update report generation to include all deps
  const handleManualReportGeneration = useCallback(async () => {
    if (!reportHandler.getLatestTrials().length) {
      console.warn('No trials available for report generation');
      return;
    }

    try {
      const report = reportHandler.generateReport(memoryKv, 'user', true);
      setFinalReport(report);
      setIsReportModalOpen(true);
      await disconnectConversation();
    } catch (error) {
      console.error('Error during report generation:', error);
    }
  }, [memoryKv, disconnectConversation, setFinalReport, setIsReportModalOpen]);

  // Auto-scroll effect for events
  useEffect(() => {
    if (!eventsScrollRef.current) return;
    const eventsEl = eventsScrollRef.current;
    const scrollHeight = eventsEl.scrollHeight;
    if (scrollHeight !== eventsScrollHeightRef.current) {
      eventsEl.scrollTop = scrollHeight;
      eventsScrollHeightRef.current = scrollHeight;
    }
  }, [realtimeEvents]);

  // Use provided reset handler if available
  const handleResetApiKey = useCallback(() => {
    if (onResetApiKey) {
      onResetApiKey();
    } else {
      defaultResetApiKey();
    }
  }, [onResetApiKey, defaultResetApiKey]);

  const header = (
    <>
      <div className="content-title">
        <span>Clinical Trials Research Assistant</span>
      </div>
      <div className="content-api-key">
        {!LOCAL_RELAY_SERVER_URL && (
          <Button buttonStyle="flush" onClick={handleResetApiKey} />
        )}
      </div>
    </>
  );

  const mainContent = (
    <>
      <EventLog
        events={realtimeEvents}
        expandedEvents={expandedEvents}
        onEventClick={handleEventClick}
        formatTime={timestamp => formatTime(timestamp, startTimeRef.current)}
        wavRecorder={wavRecorderRef.current}
        wavStreamPlayer={wavStreamPlayerRef.current}
        eventsScrollRef={eventsScrollRef}
      />
      <ConversationDisplay
        items={items}
        onDeleteItem={handleDeleteConversationItem}
      />
      <ControlPanel
        isConnected={isConnected}
        isRecording={isRecording}
        canPushToTalk={canPushToTalk}
        startRecording={startRecording}
        stopRecording={stopRecording}
        changeTurnEndType={changeTurnEndType}
        onConnect={connectConversation}
        onDisconnect={fullCleanup}
        onGenerateReport={handleManualReportGeneration}
        hasTrials={!!reportHandler.getLatestTrials().length}
      />
    </>
  );

  const sidePanel = (
    <SidePanel
      memoryKv={memoryKv}
      trials={trials}
      isLoadingTrials={isLoadingTrials}
    />
  );

  const footer = finalReport && (
    <ReportModal
      report={finalReport}
      isOpen={isReportModalOpen}
      onClose={() => setIsReportModalOpen(false)}
    />
  );

  return (
    <ConsoleLayout
      header={header}
      mainContent={mainContent}
      sidePanel={sidePanel}
      footer={footer}
    />
  );
}
