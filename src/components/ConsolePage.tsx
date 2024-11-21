// src/components/ConsolePage.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { useOpenAIClient } from '@/hooks/useOpenAIClient';
import { useAudioProcessor } from '@/hooks/useAudioProcessor';
import { formatTime } from '@/utils/timeUtils';
import { ConversationDisplay } from './console/ConversationDisplay';
import { EventLog } from './console/EventLog';
import { AudioVisualizer } from './console/AudioVisualizer';
import TrialsDisplay from './TrialsDisplay';
import ReportModal from './ReportModal';
import { Button } from './button/Button';
import { Toggle } from './toggle/Toggle';
import type { RealtimeEvent } from '@/types/console';
import type { StudyInfo } from '@/lib/ctg-tool';
import type { TrialsReport } from '@/lib/report-handler';
import { reportHandler } from '@/lib/report-handler';
import './ConsolePage.scss';

/**
 * The main component for the console page.
 * This component handles the connection to the OpenAI Realtime API,
 * manages the state of the conversation, and renders the UI.
 */
export function ConsolePage() {
  // API and Audio Processing hooks
  const { apiKey, clientRef, isConnected, setIsConnected, resetAPIKey } =
    useOpenAIClient();

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
  } = useAudioProcessor();

  // Conversation state
  const [items, setItems] = useState<ItemType[]>([]);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});

  // Event logging state
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const startTimeRef = useRef<string>(new Date().toISOString());

  // UI References for event log scrolling
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);

  // Trials and report state
  const [trials, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Event handlers
  const handleEventClick = useCallback((eventId: string) => {
    setExpandedEvents(expanded => {
      const newExpanded = { ...expanded };
      if (newExpanded[eventId]) {
        delete newExpanded[eventId];
      } else {
        newExpanded[eventId] = true;
      }
      return newExpanded;
    });
  }, []);

  const handleDeleteConversationItem = useCallback(
    async (id: string) => {
      if (!clientRef.current) return;
      clientRef.current.deleteItem(id);
    },
    [clientRef]
  );

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
  }, [memoryKv]);

  // Connection management
  const connectConversation = useCallback(async () => {
    if (!clientRef.current) return;

    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(clientRef.current.conversation.getItems());

    await setupAudio();
    await clientRef.current.connect();
    clientRef.current.createResponse();
  }, [clientRef, setupAudio, setIsConnected]);

  const disconnectConversation = useCallback(async () => {
    if (!clientRef.current) return;

    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({});
    setTrials([]);
    setIsLoadingTrials(false);

    clientRef.current?.disconnect();
    await cleanupAudio();
  }, [clientRef, cleanupAudio]);

  const fullCleanup = useCallback(async () => {
    await disconnectConversation();
    setFinalReport(null);
    reportHandler.clear();
  }, [disconnectConversation]);

  // Effect for auto-scrolling events
  useEffect(() => {
    if (!eventsScrollRef.current) return;
    const eventsEl = eventsScrollRef.current;
    const scrollHeight = eventsEl.scrollHeight;
    if (scrollHeight !== eventsScrollHeightRef.current) {
      eventsEl.scrollTop = scrollHeight;
      eventsScrollHeightRef.current = scrollHeight;
    }
  }, [realtimeEvents]);

  return (
    <div data-component="ConsolePage">
      <div className="content-top">
        <div className="content-title">
          <span>Clinical Trials Research Assistant</span>
        </div>
        <div className="content-api-key">
          {!LOCAL_RELAY_SERVER_URL && (
            <Button buttonStyle="flush" onClick={resetAPIKey} />
          )}
        </div>
      </div>
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <AudioVisualizer
              recorder={wavRecorderRef.current}
              player={wavStreamPlayerRef.current}
            />
            <EventLog
              events={realtimeEvents}
              expandedEvents={expandedEvents}
              onEventClick={handleEventClick}
              formatTime={time => formatTime(time, startTimeRef.current)}
            />
          </div>
          <ConversationDisplay
            items={items}
            onDeleteItem={handleDeleteConversationItem}
          />
          <div className="content-actions">
            <Toggle
              defaultValue={false}
              labels={['manual', 'vad']}
              values={['none', 'server_vad']}
              onChange={(_, value) =>
                changeTurnEndType(value, clientRef.current!)
              }
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? 'release to send' : 'push to talk'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={() => startRecording(clientRef.current!)}
                onMouseUp={() => stopRecording(clientRef.current!)}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? 'disconnect & reset' : 'connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={isConnected ? fullCleanup : connectConversation}
            />
            <div className="spacer" />
            {isConnected && (
              <Button
                label="End Chat & Generate Report"
                buttonStyle="action"
                onClick={handleManualReportGeneration}
                disabled={!reportHandler.getLatestTrials().length}
              />
            )}
          </div>
        </div>
        <div className="content-right">
          <div className="content-block kv z-[1]">
            <div className="content-block-title">user information</div>
            <div className="content-block-body content-kv">
              {JSON.stringify(memoryKv, null, 2)}
            </div>
          </div>
          <div className="content-block trials bg-zinc-50 z-[1]">
            <div className="content-block-title">clinical trials</div>
            <div className="content-block-body mt-12">
              <TrialsDisplay trials={trials} isLoading={isLoadingTrials} />
            </div>
          </div>
        </div>
      </div>

      {finalReport && (
        <div className="report-status">
          <span>
            Report generated at{' '}
            {new Date(finalReport.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      <ReportModal
        report={finalReport}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}

// Constant from original file
const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';
