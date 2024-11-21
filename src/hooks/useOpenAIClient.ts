/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useOpenAIClient.ts

import { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { instructions } from '@/utils/model_instructions';
import {
  CTG_TOOL_DEFINITION,
  getClinicalTrials,
  type StudyInfo,
} from '@/lib/ctg-tool';
import {
  reportHandler,
  REPORT_TOOL_DEFINITION,
  type TrialsReport,
} from '@/lib/report-handler';
import type { WavStreamPlayer } from '@/lib/wavtools';

const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

export function useOpenAIClient(initialApiKey?: string) {
  // Client state
  const [apiKey, setApiKey] = useState<string>('');
  const clientRef = useRef<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Application state affected by tools
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});
  const [trials, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Tools setup
  const addTools = useCallback(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;

    // Memory Tool
    client.addTool(
      {
        name: 'set_memory',
        description: 'Saves important data about the user into memory.',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description:
                'The key of the memory value. Always use lowercase and underscores, no other characters.',
            },
            value: {
              type: 'string',
              description: 'Value can be anything represented as a string',
            },
          },
          required: ['key', 'value'],
        },
      },
      async ({ key, value }: { [key: string]: any }) => {
        setMemoryKv(memoryKv => {
          const newKv = { ...memoryKv };
          newKv[key] = value;
          return newKv;
        });
        return { ok: true };
      }
    );

    // Clinical Trials Tool
    client.addTool(CTG_TOOL_DEFINITION, async (params: any) => {
      try {
        setIsLoadingTrials(true);
        setTrials([]);

        const trials = await getClinicalTrials(params);
        reportHandler.updateLatestTrials(trials, params);
        setTrials(trials);
        setIsLoadingTrials(false);

        return {
          status: 'success',
          resultCount: trials.length,
          trials,
          message: `Successfully retrieved ${trials.length} clinical trials matching your criteria.`,
          summary:
            trials.length > 0
              ? `Found ${trials.length} trials. The first trial is "${trials[0].studyTitle}" (${trials[0].nctNumber}).`
              : 'No matching trials found with the current criteria.',
        };
      } catch (error) {
        console.error('Error fetching trials:', error);
        setIsLoadingTrials(false);
        return {
          status: 'error',
          error: 'Failed to fetch clinical trials',
          message:
            'I apologize, but there was an error retrieving the clinical trials.',
        };
      }
    });

    // Report Generation Tool
    client.addTool(REPORT_TOOL_DEFINITION, async (params: any) => {
      try {
        const report = reportHandler.generateReport(
          memoryKv,
          'assistant',
          params.conversationComplete,
          params.finalNotes
        );

        setFinalReport(report);
        setIsReportModalOpen(true);

        return {
          status: 'success',
          message: 'Report generated successfully.',
          reportTimestamp: report.timestamp,
        };
      } catch (error) {
        console.error('Error generating report:', error);
        return {
          status: 'error',
          error: 'Failed to generate report',
          message: 'There was an error generating the trials report.',
        };
      }
    });

    client.updateSession();
  }, [memoryKv]);

  // API Key management
  const resetAPIKey = useCallback((customHandler?: () => void) => {
    if (customHandler) {
      customHandler();
      return;
    }
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  // Client initialization and setup
  useEffect(() => {
    async function fetchConfig() {
      try {
        if (initialApiKey) {
          setApiKey(initialApiKey);
          return;
        }
        console.log('Fetching configuration from /api/config');
        const response = await fetch('/api/config');
        const data = await response.json();
        if (!data.apiKey) {
          throw new Error('No API key found in configuration');
        }
        console.log('Configuration data:', data);
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    }
    fetchConfig();
  }, [initialApiKey]);

  useEffect(() => {
    if (apiKey) {
      console.log('Initializing RealtimeClient with API key:', apiKey);
      clientRef.current = new RealtimeClient(
        LOCAL_RELAY_SERVER_URL
          ? { url: LOCAL_RELAY_SERVER_URL }
          : {
              apiKey: apiKey,
              dangerouslyAllowAPIKeyInBrowser: true,
            }
      );
    }
  }, [apiKey]);

  // Event handler setup
  const setupEventHandlers = useCallback(
    (
      wavStreamPlayer: WavStreamPlayer,
      eventsSetter: (fn: (events: any[]) => any[]) => void,
      itemsSetter: (items: any[]) => void
    ) => {
      if (!clientRef.current) return;

      const client = clientRef.current;

      // Initialize session settings
      client.updateSession({ instructions: instructions });
      client.updateSession({
        input_audio_transcription: { model: 'whisper-1' },
      });

      // Event handlers
      const eventHandlers = {
        'realtime.event': (realtimeEvent: any) => {
          eventsSetter(prevEvents => {
            const lastEvent = prevEvents[prevEvents.length - 1];
            if (lastEvent?.event.type === realtimeEvent.event.type) {
              lastEvent.count = (lastEvent.count || 0) + 1;
              return prevEvents.slice(0, -1).concat(lastEvent);
            }
            return [...prevEvents, realtimeEvent];
          });
        },
        error: (event: any) => console.error(event),
        'conversation.interrupted': async () => {
          const trackSampleOffset = wavStreamPlayer.interrupt();
          if (trackSampleOffset?.trackId) {
            client.cancelResponse(
              trackSampleOffset.trackId,
              trackSampleOffset.offset
            );
          }
        },
        'conversation.updated': async ({ item, delta }: any) => {
          if (delta?.audio) {
            wavStreamPlayer.add16BitPCM(delta.audio, item.id);
          }
          if (item.status === 'completed' && item.formatted.audio?.length) {
            const wavFile = await WavRecorder.decode(
              item.formatted.audio,
              24000,
              24000
            );
            item.formatted.file = wavFile;
          }
          itemsSetter(client.conversation.getItems());
        },
      };

      // Attach event handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        client.on(event, handler);
      });

      itemsSetter(client.conversation.getItems());

      return () => {
        client.reset();
      };
    },
    []
  );

  return {
    // Client state
    apiKey,
    clientRef,
    isConnected,
    setIsConnected,
    resetAPIKey,

    // Tool-related state
    memoryKv,
    trials,
    isLoadingTrials,
    finalReport,
    isReportModalOpen,
    setIsReportModalOpen,

    // Core functions
    addTools,
    setupEventHandlers,
    setFinalReport, // Add this line
  };
}
