/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/MainPage.tsx
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealtimeClient } from '@openai/realtime-api-beta';
import type {
  InputTextContentType,
  ItemType,
} from '@openai/realtime-api-beta/dist/lib/client.js';
import { Eye, EyeOff, Mic, MicOff, PhoneOff, Settings } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Import all the required utilities and tools
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';
// import { WavRenderer } from '@/utils/wav_renderer';
import { instructions } from '@/utils/model_instructions.js';
import {
  CTG_TOOL_DEFINITION,
  getClinicalTrials,
  type StudyInfo,
} from '../lib/ctg-tool';
import {
  REPORT_TOOL_DEFINITION,
  reportHandler,
  type TrialsReport,
} from '../lib/report-handler';
// Import components
import ResultsScreen from './ResultsScreen';
// import ReportModal from '@/components/ReportModal';
// import TrialsDisplay from './TrialsDisplay';
// import { ConversationView } from './ConversationView';

// Constants
const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.PUBLIC_RELAY_SERVER_URL || '';

// Types
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}
interface LandingScreenProps {
  onStart: () => Promise<void>;
}
export default function MainPage() {
  console.log('====== MAINPAGE COMPONENT FUNCTION START ======');
  // Add a visible indicator
  useEffect(() => {
    logger.log('MAINPAGE TEST useEffect()');
  }, []);

  /* ---------------------------------------------------------------- */
  // Screen Management from App.tsx
  const [currentScreen, setCurrentScreen] = useState('landing');

  // Core State from ConsolePageOG
  const [apiKey, setApiKey] = useState<string>('');
  // Initialize client with relay server if available, otherwise null
  const clientRef = useRef<RealtimeClient | null>(null);
  // const clientRef = useRef<RealtimeClient | null>(
  //   LOCAL_RELAY_SERVER_URL
  //     ? new RealtimeClient({ url: LOCAL_RELAY_SERVER_URL })
  //     : null
  // );
  const [isConnected, setIsConnected] = useState(false);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Conversation and Memory State
  const [items, setItems] = useState<ItemType[]>([]);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);

  // UI State
  const [showConversation, setShowConversation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // const [activeTab, setActiveTab] = useState('results');
  /* ---------------------------------------------------------------- */
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  /* ---------------------------------------------------------------- */

  // Add error handling state
  const [error, setError] = useState<Error | null>(null);

  /**
   * Instantiate:
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

  // Trials and Report State
  const [, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);
  // const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // UI Refs
  const animationFrameRef = useRef<number>();
  // const visualizerRef = useRef<HTMLCanvasElement>(null);
  // const eventsScrollRef = useRef<HTMLDivElement>(null);
  // const eventsScrollHeightRef = useRef(0);

  // Add state for tracking active response
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  /**
   * When you click the API key
   * Allows manual reset of the API key
   */
  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  // Continue with Part 2 for the core functionality and UI
  // components...
  // ... continuing from Part 1

  /**
   * Tool Management
   * Handles setup and configuration of available tools
   */
  const addTools = useCallback(() => {
    // if (!clientRef.current) return;

    const client = clientRef.current;
    if (!client) return;

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

    client.addTool(CTG_TOOL_DEFINITION, async (params: any) => {
      try {
        setIsLoadingTrials(true);
        setTrials([]);

        const trials = await getClinicalTrials(params);

        // Update latest trials in report handler
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
        logger.error('Error fetching trials:', error);
        setIsLoadingTrials(false);
        return {
          status: 'error',
          error: 'Failed to fetch clinical trials',
          message:
            'I apologize, but there was an error retrieving the clinical trials.',
        };
      }
    });

    // Add report generation tool
    client.addTool(REPORT_TOOL_DEFINITION, async (params: any) => {
      try {
        const report = reportHandler.generateReport(
          memoryKv,
          'assistant',
          params.conversationComplete,
          params.finalNotes
        );

        setFinalReport(report);
        // setIsReportModalOpen(true); // Open modal when assistant generates report
        setCurrentScreen('results');
        await disconnectConversation();

        return {
          status: 'success',
          message: 'Report generated successfully.',
          reportTimestamp: report.timestamp,
        };
      } catch (error) {
        logger.error('Error generating report:', error);
        return {
          status: 'error',
          error: 'Failed to generate report',
          message: 'There was an error generating the trials report.',
        };
      }
    });

    // Update session after adding tools
    client.updateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Connection Management
   * Connect to conversation:
   * Handles establishing and terminating connections
   * WavRecorder takes speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    logger.log('====== CONNECTING CONVERSATION ======');
    logger.log('jkd connectConversation', '==clientRef', clientRef);
    logger.log(
      'jb DEBUG: connectConversation',
      '==clientRef.current',
      clientRef.current
    );
    // if (!clientRef.current) return;

    const client = clientRef.current;
    if (!client) return;
    window.debugClient = clientRef.current;

    // if clientRef.current.tools object is empty trigger addTools
    const toolsList = Object.keys(client.tools);
    // Fall back to adding tools if none are present (i.e. the useEffect
    // hook that calls addTools() didn't work for some reason)
    if (toolsList.length === 0) {
      addTools();
      // Update session after adding tools
      client.updateSession(); // ? Do we need this??
    }

    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

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

    // Connect to realtime API
    logger.debug('DEBUG: await client.connect() - pre-try');
    await client.connect();
    logger.debug('DEBUG: await client.connect() - post-try');

    // const userMessageContent: InputTextContentType[] = [
    //   {
    //     type: 'input_text',
    //     text: `Hello! I'm the engineer developing this application, and I'm just performing some tests. We don't need to talk about clinical trials or anything. Just perform a sample search, like for the latest clinical trials on ADHD. That's it.`,
    //   },
    // ];
    // logger.debug('!!!!! jb ==userMessageContent', userMessageContent);
      // client.sendUserMessageContent(userMessageContent);

    // client.sendUserMessageContent([
    //   {
    //     type: `input_text`,
    //     text: `Hello! I'm the engineer developing this application, and I'm just performing some tests. We don't need to talk about clinical trials or anything. Just perform a sample search, like for the latest clinical trials on ADHD. That's it.`,
    //   },
    // ]);
      // logger.debug('DEBUG: Sent text message:', userMessageContent);

    // logger.log('Forcing model response generation');
    client.createResponse();
    logger.log('Model response creation complete');

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record(data => client.appendInputAudio(data.mono));
    }

    logger.log('====== CONVERSATION CONNECTION COMPLETE ======');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientRef, wavRecorderRef, wavStreamPlayerRef]);

  /**
   * Disconnect and reset conversation state
   * Cleans up all connections and resets state
   */
  const disconnectConversation = useCallback(async () => {
    // if (!clientRef.current) return;

    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({});
    setTrials([]);
    setIsLoadingTrials(false);
    // setFinalReport(null);
    // reportHandler.clear();

    const client = clientRef.current;
    client?.disconnect(); // Safely disconnect if client exists

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    wavStreamPlayer.interrupt();
  }, [clientRef]);
  // }, [clientRef, wavRecorderRef, wavStreamPlayerRef]);
  // }, [apiKey, clientRef, wavRecorderRef, wavStreamPlayerRef]);

  /**
   * Full cleanup including report data
   * Use this for complete reset of the application state
   */
  const fullCleanup = useCallback(async () => {
    await disconnectConversation();
    setFinalReport(null);
    reportHandler.clear();
  }, [disconnectConversation]);

  /**
   * Audio Management
   * Handles all audio recording and playback functionality
   */
  const startRecording = async () => {
    // if (!clientRef.current) return;

    setIsRecording(true);
    const client = clientRef.current;
  
    if (!client) return;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record(data => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording = async () => {
    logger.debug('Stopping recording. Current setIsRecording: ', isRecording);
    if (!clientRef.current || !isRecording) return;

    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
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
  };

  /**
   * Switch between Manual <> VAD mode for communication
   * Handles turn detection type changes
   */
  const changeTurnEndType = async (value: string) => {
    // if (!clientRef.current) return;

    const client = clientRef.current;
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
  };

  /**
   * Report Management
   * Handles manual report generation and conversation end
   */
  const handleManualReportGeneration = useCallback(async () => {

    if (!reportHandler.getLatestTrials().length) {
      logger.warn('No trials available for report generation');
      // First disconnect conversation
      await disconnectConversation();

      setCurrentScreen('landing');
      return;
    }

    try {
      logger.debug('Generating report manually');

      // First disconnect conversation
      await disconnectConversation();

      // Generate report first
      const report = reportHandler.generateReport(
        memoryKv,
        'user',
        true // mark as complete since user is ending conversation
      );
      setFinalReport(report);
      logger.log('Report set:', report);

      // setIsReportModalOpen(true); // Open modal after report
      // generation
      setCurrentScreen('results');
      logger.log('Results screen opened');
      logger.debug('Manual report generation complete:', {
        timestamp: report.timestamp,
        trialsCount: report.trials.length,
      });
      logger.log('Report generated and conversation ended by user');
    } catch (error) {
      logger.error('Error during report generation:', error);
      // Optionally show error to user
    }
  }, [memoryKv, disconnectConversation]);




  /**
   * Delete a conversation item by its ID.
   *
   * @param id - The ID of the item to delete.
   */
  const deleteConversationItem = useCallback(async (id: string) => {
    // if (!clientRef.current) return;
    const client = clientRef.current;
    if (!client) return;
    client.deleteItem(id);
  }, []);

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* **************************************************************** */
  /*                           EFFECT HOOKS                           */
  /* **************************************************************** */
  /*        Organized by initialization order and dependencies        */
  /* **************************************************************** */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /**
   * API and Client Initialization
   * Fetch API Key from configuration on component mount (signified by
   * empty dependency array), but only if not using local relay server.
   */
  // Fetch API key on component mount
  useEffect(() => {
    // Skip API key fetch if using relay server
    if (LOCAL_RELAY_SERVER_URL) {
      // logger.log(
      //   '~~~~~~ Client Already Initialized (with Relay Server) ~~~~~~'
      // );
      logger.log(
        '~~~~~~ RELAY SERVER DETECTED ~~~~~~',
        '\nSetting up RealtimeClient with relay server'
      );
      clientRef.current = new RealtimeClient({ url: LOCAL_RELAY_SERVER_URL });
      setIsInitialized(true);
      setIsLoading(false);
      // logger.log('~~~~~~ RELAY SERVER DETECTED ~~~~~~');
      // logger.log('****** Skipping API key fetch ******');
      logger.log(
        '~~~~~~ CLIENT INITIALIZED WITH RELAY SERVER ~~~~~~',
        isInitialized,
        isLoading
      );
      return;
    }

    async function initWithApiKey() {
      try {
        logger.log(
          '!######! WARNING !######!',
          '====== RELAY SERVER NOT DETECTED, FETCHING API KEY ======'
        );
        setIsLoading(true);
        logger.debug('Fetching configuration from /api/config');
        const response = await fetch('/api/config');
        logger.debug('FETCHED CONFIGURATION:', response);
        logger.debug('Parsing configuration data');
        const data = await response.json();
        if (!data.apiKey) {
          throw new Error('No API key found');
        }
        logger.debug('PARSED CONFIGURATION DATA:', data);

        clientRef.current = new RealtimeClient({
          apiKey: data.apiKey,
          dangerouslyAllowAPIKeyInBrowser: true,
        });

        setApiKey(data.apiKey);
        setIsInitialized(true);
        logger.log(
          '====== CLIENT INITIALIZED WITH API KEY ======',
          isInitialized,
          isLoading
        );
      } catch (error) {
        setError(error as Error);
        logger.error('Error fetching config:', error);
      } finally {
        setIsLoading(false);
      }
    }
    initWithApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // /**
  //  * ? RealtimeClient Initialization (or re-initialization?) when API
  //  * ? key changes
  //  * ? Initialize RealtimeClient with API key on API key change
  //  */
  // useEffect(() => {
  //   if (apiKey) {
  //     logger.log('Initializing RealtimeClient with API key:', apiKey);
  //     // clientRef.current = new RealtimeClient({ url: LOCAL_RELAY_SERVER_URL });
  //     clientRef.current = new RealtimeClient(
  //       LOCAL_RELAY_SERVER_URL
  //         ? { url: LOCAL_RELAY_SERVER_URL }
  //         : {
  //             apiKey: apiKey,
  //             dangerouslyAllowAPIKeyInBrowser: true,
  //           }
  //     );
  //   }
  // }, [apiKey]);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    if (!isInitialized) return; // Don't run until initialized
    logger.log('====== CORE SETUP STARTING ======');
    logger.log(
      'Starting core setup of RealtimeClient, audio capture, eventHandlers, etc. (WITHOUT connecting to conversation)'
    );

    // Get refs
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    // if (!client) return;
    if (!client) {
      console.error('Client not initialized despite isInitialized flag');
      return;
    }

    // Initialize session settings
    // Set instructions
    logger.log('Setting instructions and transcription model:', {
      model: 'whisper-1',
    });

    // Other voice option is 'ash'; heavier and 'authoritative'?
    client.updateSession({ instructions: instructions, voice: 'echo' });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // Event handlers setup
    // handle realtime events from client + server for event logging
    logger.log('Setting up event listeners');
    const eventHandlers = {
      'realtime.event': (realtimeEvent: RealtimeEvent) => {
        if (realtimeEvent.event.type === 'error') {
          logger.error(
            `
            ! ===============================
            ! ERROR IN REALTIME EVENT
            ! ===============================
            ! Event: ${JSON.stringify(realtimeEvent.event)}
            ! Details:
            `,
            realtimeEvent
          );
          logger.error(client.conversation.responses);
          client.createResponse();
        } else if (realtimeEvent.source === 'server') {
          logger.log(
            `
            ╔════════════════════════════════════════════════════════════════════════════════
            ║ REALTIME EVENT - RECEIVED FROM ${realtimeEvent.source}
            ║ Type: ${realtimeEvent.event.type}
            ║ Time: ${realtimeEvent.time}
            ║ Event ID: ${realtimeEvent.event.event_id}
            ║ Item ID: ${realtimeEvent.event.item?.id}
            ║ Event Details Below:
            ╚════════════════════════════════════════════════════════════════════════════════
            `,
            realtimeEvent
          );
          logger.error(client.conversation.responses);
          // ║ Event: ${JSON.stringify(realtimeEvent.event)}
        } else if (realtimeEvent.source === 'client') {
          logger.log(
            `
            +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            + REALTIME EVENT - SENT BY ${realtimeEvent.source}
            + Type: ${realtimeEvent.event.type}
            + Time: ${realtimeEvent.time}
            + Event ID: ${realtimeEvent.event.event_id}
            + Item ID: ${realtimeEvent.event.item?.id}
            + Event Details Below:
            +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            `,
            realtimeEvent
          );
          logger.error(client.conversation.responses);
        } else {
          logger.log(
            `
            ! ===============================
            ! UNKNOWN REALTIME EVENT SOURCE
            ! ===============================
            ! Event: ${realtimeEvent.event}
            ! Details:
            `,
            realtimeEvent
          );
        }

        // Track response.audio.delta events which contain response_id
        if (
          realtimeEvent.event.type === 'response.audio.delta' &&
          realtimeEvent.event.response_id
        ) {
          setActiveResponseId(realtimeEvent.event.response_id);
        }

        // Clear active response when done
        if (realtimeEvent.event.type === 'response.done') {
          setActiveResponseId(null);
          logger.error(
            `Response count: ${client.conversation.responses.length}`
          );
        }

        setRealtimeEvents(realtimeEvents => {
          const lastEvent = realtimeEvents[realtimeEvents.length - 1];

          if (lastEvent?.event.type === realtimeEvent.event.type) {
            logger.debug(
              `[REALTIME] Incrementing count for repeated event: ${realtimeEvent.event.type}`
            );
            lastEvent.count = (lastEvent.count || 0) + 1;
            return realtimeEvents.slice(0, -1).concat(lastEvent);
          } else {
            logger.debug(
              `[REALTIME] Adding new event type: ${realtimeEvent.event.type}`
            );
            return realtimeEvents.concat(realtimeEvent);
          }
        });
      },

      'error': (event: any) => {
        logger.error(
          `
          ! ===============================
          ! ERROR IN EVENT HANDLER
          ! ===============================
          ! Details:
          `,
          event
        );
      },

      'conversation.interrupted': async () => {
        logger.warn(
          `
          ▼ ==============================
          ▼ CONVERSATION INTERRUPTED
          ▼ ==============================
          `
        );

        const trackSampleOffset = wavStreamPlayer.interrupt();

        if (trackSampleOffset?.trackId) {
          logger.info(
            `[INTERRUPT] Canceling response for track: ${trackSampleOffset.trackId}`
          );
          client.cancelResponse(
            trackSampleOffset.trackId,
            trackSampleOffset.offset
          );
        } else {
          logger.debug('[INTERRUPT] No active track to cancel');
        }
      },

      'conversation.updated': async ({ item, delta }: any) => {
        // logger.log(
        //   `
        //   ┌──────────────────────────────
        //   │ CONVERSATION UPDATE
        //   │ Item ID: ${item.id}
        //   │ Status: ${item.status}
        //   │ ¶¶¶¶¶ HAS AUDIO DELTA: ${!!delta?.audio} ¶¶¶¶¶
        //   └──────────────────────────────
        //   `
        // );
        logger.log(
          `CONVERSATION UPDATE --- Item ID: ${item.id}; Status: ${item.status}; ¶¶¶¶¶ HAS AUDIO DELTA: ${!!delta?.audio} ¶¶¶¶¶`
        );

        if (delta?.audio) {
          logger.debug(
            '[AUDIO] AUDIO OUT DETECTED --- Processing new audio delta'
          );
          logger.debug(
            `
            ¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶
            ¶ STARTING TO PLAY AUDIO for
            ¶ Item ID: ${item.id}
            ¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶
            `
          );
          wavStreamPlayer.add16BitPCM(delta.audio, item.id);
        }
        if (item.status === 'completed' && item.formatted.audio?.length) {
          logger.info(
            '[AUDIO] AUDIO PLAYBACK COMPLETED for item ${item.id}',
            '\n[AUDIO] Converting completed audio message'
          );

          const wavFile = await WavRecorder.decode(
            item.formatted.audio,
            24000,
            24000
          );
          item.formatted.file = wavFile;
          logger.debug('[AUDIO] Audio conversion complete');
        }

        setItems(client.conversation.getItems());
      },
    };

    // Attach event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      client.on(event, handler);
    });

    setItems(client.conversation.getItems());

    logger.log('====== CORE SETUP COMPLETE ======');
    return () => {
      client.reset(); // cleanup; resets to defaults
    };
  }, [isInitialized]); // Run when initialization completes

  /**
   * Tool and Core Setup
   */
  useEffect(() => {
    addTools();
  }, [addTools]); // ? jb
  // }, [apiKey, addTools]); // ? jkd

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  // /**
  //  * UI Effects
  //  * Auto-scroll the event logs
  //  */
  // useEffect(() => {
  //   if (!eventsScrollRef.current) return;
  //   const eventsEl = eventsScrollRef.current;
  //   const scrollHeight = eventsEl.scrollHeight;
  //   if (scrollHeight !== eventsScrollHeightRef.current) {
  //     eventsEl.scrollTop = scrollHeight;
  //     eventsScrollHeightRef.current = scrollHeight;
  //   }
  // }, [realtimeEvents]);

  // /**
  //  * Auto-scroll the conversation logs
  //  */
  // useEffect(() => {
  //   const conversationEls = [].slice.call(
  //     document.body.querySelectorAll('[data-conversation-content]')
  //   );
  //   for (const el of conversationEls) {
  //     const conversationEl = el as HTMLDivElement;
  //     conversationEl.scrollTop = conversationEl.scrollHeight;
  //   }
  // }, [items]);

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  // Audio Visualization Effect
  // First, let's add new components for status handling

  const StatusIndicator = ({
    isConnected,
    isRecording,
    hasError,
  }: {
    isConnected: boolean;
    isRecording: boolean;
    hasError: boolean;
  }) => (
    <div className="absolute top-4 left-4 flex items-center space-x-2">
      <div
        className={`h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500' : hasError ? 'bg-red-500' : 'bg-gray-500'
        }`}
      />
      <span className="text-sm text-gray-600">
        {hasError
          ? 'Error'
          : isConnected
            ? isRecording
              ? 'Recording'
              : 'Connected'
            : 'Disconnected'}
      </span>
    </div>
  );

  const AudioVisualization = ({
    isRecording,
    wavRecorderRef,
    wavStreamPlayerRef,
  }: {
    isRecording: boolean;
    wavRecorderRef: React.RefObject<WavRecorder>;
    wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
  }) => {
    const clientCanvasRef = useRef<HTMLCanvasElement>(null);
    const serverCanvasRef = useRef<HTMLCanvasElement>(null);
    // const animationFrameRef = useRef<number>();

    useEffect(() => {
      if (!clientCanvasRef.current || !serverCanvasRef.current) return;

      const clientCanvas = clientCanvasRef.current;
      const serverCanvas = serverCanvasRef.current;
      const clientCtx = clientCanvas.getContext('2d');
      const serverCtx = serverCanvas.getContext('2d');

      if (!clientCtx || !serverCtx) return;

      let isLoaded = true;

      const animate = () => {
        // Draw input audio visualization (circular)
        const width = clientCanvas.width;
        const height = clientCanvas.height;

        // Clear both canvases
        clientCtx.clearRect(0, 0, width, height);
        serverCtx.clearRect(0, 0, width, height);

        // Draw input visualization
        if (isRecording) {
          // Base circle
          clientCtx.beginPath();
          clientCtx.arc(width / 2, height / 2, 50, 0, 2 * Math.PI);
          clientCtx.strokeStyle = '#666';
          clientCtx.lineWidth = 2;
          clientCtx.stroke();

          // Animated waves
          const time = Date.now() / 1000;
          const numWaves = 3;

          for (let i = 0; i < numWaves; i++) {
            const audioData =
              wavRecorderRef.current?.getFrequencies?.('voice')?.values;
            const audioInfluence = audioData
              ? Array.from(audioData).reduce((sum, val) => sum + val, 0) /
                audioData.length
              : Math.sin(time * 2 + i);

            const radius = 50 + audioInfluence * 10;

            clientCtx.beginPath();
            clientCtx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
            clientCtx.strokeStyle = `rgba(0, 153, 255, ${0.3 - i * 0.1})`;
            clientCtx.stroke();
          }
        }

        // Draw output visualization (small waveform)
        if (wavStreamPlayerRef.current?.analyser) {
          const values =
            wavStreamPlayerRef.current.getFrequencies('voice')?.values ||
            new Float32Array([0]);

          serverCtx.beginPath();
          serverCtx.moveTo(0, height / 2);

          values.forEach((value, index) => {
            const x = (index / values.length) * width;
            const y = height / 2 + (value * height) / 4;
            serverCtx.lineTo(x, y);
          });

          serverCtx.strokeStyle = '#009900';
          serverCtx.stroke();
        }

        if (isLoaded) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animate();

      return () => {
        isLoaded = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isRecording, wavRecorderRef, wavStreamPlayerRef]);

    return (
      <div className="relative flex flex-col items-center space-y-2">
        <canvas
          ref={clientCanvasRef}
          className="w-32 h-32 rounded-full bg-gray-50"
          width={128}
          height={128}
        />
        <canvas
          ref={serverCanvasRef}
          className="w-32 h-8 rounded-lg bg-gray-50"
          width={128}
          height={32}
        />
      </div>
    );
  };

  const AudioPlayer = ({ file }: { file: { url: string } }) => (
    <div className="mt-2">
      <audio src={file.url} controls className="w-full max-w-xs" />
    </div>
  );

  /* ---------------------------------------------------------------- */

  useEffect(() => {
    logger.log('====== CURRENT SCREEN:', currentScreen, '======');
    // logger.log('Current screen:', currentScreen); // Add logging
  }, [currentScreen]);

  /* ---------------------------------------------------------------- */

  const handleStart = async () => {
    logger.log('=== Handling START - pre-try ===');
    try {
      logger.debug('DEBUG: clientRef current state:', clientRef.current); // Add this
      logger.debug('DEBUG: apiKey state:', apiKey); // Add this
      logger.log('--- Connecting conversation ---');
      await connectConversation();
      logger.log('--- Connection successful ---');
      logger.debug('DEBUG: Setting current screen to voiceChat');
      setCurrentScreen('voiceChat');
      logger.log('=== Handling START done - post-try ===');
    } catch (error) {
      logger.error('====== CONNECTION FAILED: ======\n', error);
      // Add more error details
      logger.error('Error details:', {
        clientRef: clientRef.current,
        apiKey,
        isConnected,
      });
    }
  };

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  // UI Components
  const LandingScreen: React.FC<LandingScreenProps> = ({ onStart }) => (
    <div className="flex flex-col flex-grow overflow-auto items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-bold leading-tight mb-6">
        Find the Right Clinical Trial.
        <br />
        Anywhere, Anytime.
      </h1>
      <p className="text-lg text-gray-600 mb-16 max-w-2xl">
        {/* add line break after "Search for trials..." */}
        Search for trials in your language, tailored to your knowledge level.
        <br />
        Simplifying access for patients and caregivers worldwide.
      </p>
      <div className="flex flex-col items-center">
        <p className="text-sm mb-4">Tap to start</p>
        <button
          // variant="outline"
          // size="icon"
          className="w-20 h-20 rounded-full bg-black hover:bg-gray-800 transition-colors flex items-center justify-center"
          onClick={() => {
            // logger.log('Button clicked - immediate feedback');
            onStart();
          }}
          // onClick={async () => {
          //   await connectConversation();
          //   setCurrentScreen('voiceChat');
          // }}
        >
          <Mic className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );

  // const LandingScreen = () => (
  //   <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
  //     <h1 className="text-5xl font-bold leading-tight mb-6">
  //       Find the Right Clinical Trial, Anywhere, Anytime
  //     </h1>
  //     <p className="text-lg text-gray-600 mb-16 max-w-2xl">
  //       Search for trials in your language, tailored to your knowledge level.
  //       Simplifying access for patients and caregivers worldwide
  //     </p>
  //     <div className="flex flex-col items-center">
  //       <p className="text-sm mb-4">Tap to start</p>
  //       <button
  //         // variant="outline"
  //         // size="icon"
  //         className="w-20 h-20 rounded-full bg-black hover:bg-gray-800 transition-colors flex items-center justify-center"
  //         onClick={() => {
  //           logger.log('Button clicked - immediate feedback');
  //           handleStart();
  //         }}
  //         // onClick={async () => {
  //         //   await connectConversation();
  //         //   setCurrentScreen('voiceChat');
  //         // }}
  //       >
  //         <Mic className="w-8 h-8 text-white" />
  //       </button>
  //     </div>
  //   </div>
  // );

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  // Enhanced conversation components with proper message handling
  const ConversationView = ({
    items,
    showConversation,
  }: {
    items: ItemType[];
    showConversation: boolean;
  }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = React.useState(true);

    React.useEffect(() => {
      if (autoScroll && scrollRef.current) {
        const scrollElement = scrollRef.current;
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }, [items, autoScroll]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isNearBottom);
    };

    if (!showConversation) return null;

    return (
      <ScrollArea
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-[500px] border border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-xl shadow-sm overflow-auto flex-wrap"
        // viewportClassName="h-full" // ? What's the right property here?
      >
        <div className="p-6 space-y-4">
          {!items.length ? (
            <div className="flex items-center justify-center h-full flex-wrap">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="mb-2 text-lg font-medium">No messages yet</div>
                <div className="text-sm">
                  Your conversation will appear here
                </div>
              </div>
            </div>
          ) : (
            items.map(item => <ConversationItem key={item.id} item={item} />)
          )}
        </div>
      </ScrollArea>
    );
  };

  const ConversationItem = ({ item }: { item: ItemType }) => {
    const getContent = () => {
      if (item.type === 'function_call_output') {
        return (
          // <div className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap flex-wrap text-wrap">
          //   {item.formatted.output}
          // </div>
          null
        );
      }

      if (item.formatted.tool) {
        return (
          <div className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap flex-wrap">
            {item.formatted.tool.name}({item.formatted.tool.arguments})
          </div>
        );
      }

      if (item.role === 'user') {
        return (
          <div className="text-sm break-words whitespace-pre-wrap flex-wrap">
            {item.formatted.transcript ||
              (item.formatted.audio?.length
                ? '(awaiting transcript)'
                : item.formatted.text || '(item sent)')}
          </div>
        );
      }

      if (item.role === 'assistant') {
        return (
          <div className="text-sm break-words whitespace-pre-wrap flex-wrap">
            {item.formatted.transcript || item.formatted.text || '(truncated)'}
          </div>
        );
      }

      return null;
    };

    const getRoleStyles = () => {
      switch (item.role) {
        case 'system':
          return 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800';
        case 'assistant':
          return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30';
        default:
          return 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30';
      }
    };

    return (
      <div className="group animate-fade-in">
        <div
          className={`relative border rounded-lg overflow-hidden transition-all ${getRoleStyles()}`}
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {(item.role || item.type).replaceAll('_', ' ')}
              </span>
            </div>
            <button
              onClick={() => deleteConversationItem(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4">
            <div className="text-gray-800 dark:text-gray-200 max-w-full overflow-hidden">
              {getContent()}
            </div>
            {item.formatted.file && (
              <div className="mt-2">
                <AudioPlayer file={item.formatted.file} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  const ErrorDisplay = ({ error }: { error: Error | null }) => {
    if (!error) return null;

    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
        {error?.message}
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  // Settings Menu Component
  const SettingsMenu = ({
    resetAPIKey,
    changeTurnEndType,
    canPushToTalk,
    fullCleanup,
  }: {
    resetAPIKey: () => void;
    changeTurnEndType: (value: string) => Promise<void>;
    canPushToTalk: boolean;
    fullCleanup: () => Promise<void>;
  }) => (
    <div className="absolute top-16 right-4 z-20 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
      <h3 className="font-semibold mb-4">Settings</h3>
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={resetAPIKey}
          className="w-full justify-start"
        >
          Reset API Key
        </Button>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Voice Detection Mode:</label>
          <VadToggle
            canPushToTalk={canPushToTalk}
            onChange={value => changeTurnEndType(value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fullCleanup}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Reset Everything
        </Button>
      </div>
    </div>
  );

  // Enhanced VAD Toggle component
  const VadToggle = ({
    canPushToTalk,
    onChange,
  }: {
    canPushToTalk: boolean;
    onChange: (value: string) => void;
  }) => (
    <div className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50">
      <button
        className={`px-3 py-1 rounded-md transition-colors ${
          canPushToTalk ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}
        onClick={() => onChange('none')}
      >
        Manual
      </button>
      <button
        className={`px-3 py-1 rounded-md transition-colors ${
          !canPushToTalk
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
        onClick={() => onChange('server_vad')}
      >
        VAD
      </button>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  const VoiceChatScreen = ({
    isConnected,
    isRecording,
    canPushToTalk,
    showConversation,
    hasError,
    error,
    items,
    startRecording,
    stopRecording,
    setShowConversation,
    handleManualReportGeneration,
    wavRecorderRef,
    wavStreamPlayerRef,
  }: {
    isConnected: boolean;
    isRecording: boolean;
    canPushToTalk: boolean;
    showConversation: boolean;
    hasError: boolean;
    error: Error | null;
    items: ItemType[];
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    setShowConversation: (show: boolean) => void;
    handleManualReportGeneration: () => Promise<void>;
    wavRecorderRef: React.RefObject<WavRecorder>;
    wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;
  }) => (
    <div className="flex flex-col flex-grow overflow-auto items-center p-6">
      <StatusIndicator
        isConnected={isConnected}
        isRecording={isRecording}
        hasError={hasError}
      />

      <ErrorDisplay error={error} />

      <h1 className="text-2xl font-bold mb-12">Clinical Trial Finder</h1>

      <div className="flex-grow flex items-center justify-center w-full">
        <AudioVisualization
          isRecording={isRecording}
          wavRecorderRef={wavRecorderRef}
          wavStreamPlayerRef={wavStreamPlayerRef}
        />
      </div>

      <ConversationView items={items} showConversation={showConversation} />

      <div className="w-full max-w-md flex justify-center space-x-8 mt-8">
        <div className="flex flex-col items-center">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 mb-2"
            onClick={() => setShowConversation(!showConversation)}
          >
            {showConversation ? (
              <EyeOff className="w-6 h-6" />
            ) : (
              <Eye className="w-6 h-6" />
            )}
          </Button>
          <span className="text-sm text-gray-600">
            {showConversation ? 'Hide Convo' : 'View Convo'}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full w-12 h-12 mb-2 ${
              isRecording ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            // onMouseLeave={stopRecording} // Safety: stop if mouse leaves button
            disabled={!isConnected || !canPushToTalk}
          >
            {isRecording ? (
              <Mic className="w-6 h-6 text-blue-500" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
          <span className="text-sm text-gray-600">
            {isRecording ? 'Recording...' : 'Push to Talk'}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-12 h-12 mb-2"
            // onClick={async () => {
            //   await handleManualReportGeneration();
            //   setCurrentScreen('results');
            // }}
            // disabled={!trials.length}
            onClick={handleManualReportGeneration}
            disabled={!isConnected || isRecording}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <span className="text-sm text-gray-600">End Chat</span>
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */
  /* ==================== log element dimensions ==================== */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const mainPageElement = document.getElementById('main-page-root');
    if (mainPageElement) {
      logger.debug(
        'DEBUG: MainPage root clientHeight:',
        mainPageElement.clientHeight
      );
    }
  }, []);
  /* ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* **************************************************************** */
  /*                            MAIN RENDER                           */
  /* **************************************************************** */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  /* ===================== Guard the main render ==================== */
  const LoadingState = ({ error }: { error: Error | null }) => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="text-red-600">
            {error?.message || 'Failed to load'}
          </div>
        )}
      </div>
    </div>
  );

  // Then in render guard:
  if (!isInitialized || isLoading) {
    return <LoadingState error={error} />;
  }

  /* ---------------------------------------------------------------- */

  // Main render function with proper state handling
  return (
    <div
      id="main-page-root"
      className="flex flex-col flex-1 flex-grow overflow-auto bg-white relative"
    >
      {/* Settings Button - Only show when NOT on results screen */}
      {currentScreen !== 'results' && (
        <div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      )}


      {/* Settings Menu - Only show when NOT on results screen */}
      {showSettings && currentScreen !== 'results' && (
        <SettingsMenu
          resetAPIKey={resetAPIKey}
          changeTurnEndType={changeTurnEndType}
          canPushToTalk={canPushToTalk}
          fullCleanup={fullCleanup}
        />
      )}


      {/* Landing Screen */}
      {currentScreen === 'landing' && (
        <LandingScreen
          onStart={async () => {
            try {
              // await connectConversation();
              // setCurrentScreen('voiceChat');
              logger.debug('DEBUG: START Button clicked - immediate feedback');
              handleStart();
            } catch (err) {
              setError(err as Error);
            }
          }}
        />
      )}

      {/* Voice Chat Screen */}
      {currentScreen === 'voiceChat' && (
        <VoiceChatScreen
          isConnected={isConnected}
          isRecording={isRecording}
          canPushToTalk={canPushToTalk}
          showConversation={showConversation}
          hasError={!!error}
          error={error}
          items={items}
          startRecording={startRecording}
          stopRecording={stopRecording}
          setShowConversation={setShowConversation}
          handleManualReportGeneration={async () => {
            try {
              await handleManualReportGeneration();
            } catch (err) {
              setError(err as Error);
            }
          }}
          wavRecorderRef={wavRecorderRef}
          wavStreamPlayerRef={wavStreamPlayerRef}
        />
      )}

      {/* Results Screen */}
          {currentScreen === 'results' && finalReport && (
              <ResultsScreen
                  finalReport={finalReport}
                  isLoadingTrials={isLoadingTrials}
                  onStartNewSearch={async () => {
                      try {
                          logger.debug('Starting new search from results screen');
                          await connectConversation();
                          setCurrentScreen('voiceChat');
                      } catch (error) {
                          logger.error('Error starting new search:', error);
                          // Could add error handling UI here
                      }
                  }}
              />
      )}

      {/* Error Boundary */}
      <ErrorDisplay error={error} />
    </div>
  );
}
