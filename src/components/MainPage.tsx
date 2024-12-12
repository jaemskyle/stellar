/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/MainPage.tsx
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealtimeClient } from '@openai/realtime-api-beta';
import type {
  InputTextContentType,
  ItemType,
} from '@openai/realtime-api-beta/dist/lib/client.js';
import { Eye, EyeOff, Mic, PhoneOff, Settings } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// Import all the required utilities and tools
import { useAudioManager } from '@/hooks/useAudioManager';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';
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

// Import screens
import { LandingScreen } from '@/components/screens/LandingScreen';
import { VoiceChatScreen } from '@/components/screens/VoiceChatScreen';
import ResultsScreen from '@/components/screens/ResultsScreen';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useSettings } from '@/hooks/useSettings';
import { SettingsMenu } from '@/components/settings/SettingsMenu';

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
  // const [activeTab, setActiveTab] = useState('results');
  /* ---------------------------------------------------------------- */
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  /* ---------------------------------------------------------------- */

  // Add error handling state
  const [error, setError] = useState<Error | null>(null);

  // Trials and Report State
  const [, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);
  // const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // UI Refs
  // const animationFrameRef = useRef<number>();
  // const visualizerRef = useRef<HTMLCanvasElement>(null);
  // const eventsScrollRef = useRef<HTMLDivElement>(null);
  // const eventsScrollHeightRef = useRef(0);

  // Add state for tracking active response
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  /**
   * Audio Management
   * Handles all audio recording and playback functionality
   */
  const {
    isRecording,
    canPushToTalk,
    startRecording,
    stopRecording,
    resetAudioState,
    initializeAudio,
    changeTurnEndType,
    wavRecorderRef,
    wavStreamPlayerRef,
  } = useAudioManager({
    client: clientRef.current,
    activeResponseId,
  });

  /**
   * Settings Management
   * Handles settings UI visibility
   */
  const { showSettings, setShowSettings } = useSettings();

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
        logger.info(`
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
          @ [TOOL CALL] Calling 'set_memory' function:
          @
          @ Key: ${key}
          @ Value: ${value}
          @
        `);
        setMemoryKv(memoryKv => {
          const newKv = { ...memoryKv };
          newKv[key] = value;
          return newKv;
        });
        logger.info(`
          @
          @ [TOOL CALL] 'set_memory' function call complete.
          @ Memory updated with key "${key}"
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        `);
        return { ok: true };
      }
    );

    client.addTool(CTG_TOOL_DEFINITION, async (params: any) => {
      try {
        logger.info(`
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
          @ [TOOL CALL] Calling 'get_trials' function:
          @
          @ Parameters:
          @ ${JSON.stringify(params)}
        `);
        setIsLoadingTrials(true);
        setTrials([]);

        logger.debug('[DEBUG] Fetching clinical trials with params:', params);
        const trials = await getClinicalTrials(params);

        // Update latest trials in report handler
        reportHandler.updateLatestTrials(trials, params);

        setTrials(trials);
        setIsLoadingTrials(false);

        logger.info(`
          @
          @ [TOOL CALL] 'get_trials' function call complete.
          @ Found ${trials.length} trials matching criteria
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        `);
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
        logger.info(`
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
          @ [TOOL CALL] Calling 'generate_report' function:
          @
          @ Conversation Complete: ${params.conversationComplete}
          @ Final Notes: ${params.finalNotes}
          @
        `);
        setFinalReport(report);
        // setIsReportModalOpen(true); // Open modal when assistant generates report
        setCurrentScreen('results');

        await disconnectConversation();

        logger.info(`
          @
          @ [TOOL CALL] 'generate_report' function call complete.
          @ Report generated successfully.
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        `);
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

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Initialize audio devices
    await initializeAudio();

    // Connect to realtime API
    logger.debug('[DEBUG] await client.connect() - pre-try');
    await client.connect();
    logger.debug('[DEBUG] await client.connect() - post-try');

    const userMessageContent: InputTextContentType[] = [
      {
        type: 'input_text',
        text: `Hello! I'm the engineer developing this application, and I'm just performing some tests. We don't need to talk about clinical trials or anything. Just perform a sample search, like for the latest clinical trials on ADHD. That's it. In addition, please also memorize the fact that I'm 30 years old, and use that information for search filtering purposes. Thanks!`,
      },
    ];
    client.sendUserMessageContent(userMessageContent);
    logger.debug('[DEBUG] Sent text message:', userMessageContent);

    // console.log('Forcing model response generation');
    // client.createResponse();

    const wavRecorder = wavRecorderRef.current;
    if (wavRecorder && client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record(data => client.appendInputAudio(data.mono));
    }

    logger.log('====== CONVERSATION CONNECTION COMPLETE ======');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientRef]);
  // }, [clientRef, initializeAudio, wavRecorderRef, wavStreamPlayerRef]);

  /**
   * Disconnect and reset conversation state
   * Cleans up all connections and resets state
   */
  const disconnectConversation = useCallback(async () => {
    // if (!clientRef.current) return;
    logger.log('====== DISCONNECTING CONVERSATION ======');
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({});
    setTrials([]);
    setIsLoadingTrials(false);
    // setFinalReport(null);
    // reportHandler.clear();

    logger.debug('\n[DEBUG] Disconnecting CLIENT');
    const client = clientRef.current;
    client?.disconnect(); // Safely disconnect if client exists
    logger.debug('[DEBUG] Client disconnected\n------');
    logger.debug('[DEBUG] Resetting AUDIO STATE');
    await resetAudioState();
    logger.debug('[DEBUG] Audio state reset\n------');
  }, [clientRef]);

  /**
   * Full cleanup including report data
   * Use this for complete reset of the application state
   */
  const fullCleanup = useCallback(async () => {
    await disconnectConversation();
    setFinalReport(null);
    reportHandler.clear();
  }, []);

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

      // Generate report first
      const report = reportHandler.generateReport(
        memoryKv,
        'user',
        true // mark as complete since user is ending conversation
      );
      setFinalReport(report);
      logger.log('Report set:', report);

      // Disconnect conversation
      await disconnectConversation();

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
  }, []);

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
      clientRef.current = new RealtimeClient({ url: LOCAL_RELAY_SERVER_URL });
      setIsInitialized(true);
      setIsLoading(false);
      // logger.log('****** Skipping API key fetch ******');
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
    // if (!wavStreamPlayer) return;

    // if (!client) return;
    if (!client) {
      console.error('Client not initialized despite isInitialized flag');
      return;
    }
    if (!wavStreamPlayer) {
      console.error('wavStreamPlayer is null or undefined');
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
          // Check if the error has a message saying exactly:
          // "Conversation already has an active response", in which
          // case, we should run `client.createResponse()` to force a
          // new response. This is a workaround for a bug in the
          // realtime API.
          if (
            realtimeEvent.event.error.message ===
            'Conversation already has an active response'
          ) {
            logger.error(
              `
              ! ********************************************************
              ! [ERROR] "CONVERSATION ALREADY HAS AN ACTIVE RESPONSE"
              ! ********************************************************
              ! Event Type: ${realtimeEvent.event.error.type}
              ! Details:
              `,
              realtimeEvent
            );
            logger.warn(
              'Forcing a new response due to known bug in realtime API'
            );
            // Add a delay of half a second before creating a new response:
            setTimeout(() => {
              client.createResponse();
            }, 500);
          } else {
            logger.error(
              `
            ! ==========================================================
            ! [ERROR] UNKNOWN REALTIME EVENT ERROR
            ! ==========================================================
            ! Event: ${JSON.stringify(realtimeEvent.event)}
            ! Details:
            `,
              realtimeEvent
            );
          }
          logger.debug(client.conversation.responses);
        } else if (realtimeEvent.source === 'server') {
          logger.log(
            `
            ╔════════════════════════════════════════════════════════════════════════════════
            ║ [SERVER] SENT "${realtimeEvent.event.type}" event to CLIENT
            ╚════════════════════════════════════════════════════════════════════════════════
            ║ Event ID: ${realtimeEvent.event.event_id}
            ║ Item ID: ${realtimeEvent.event.item?.id}
            ║ Event Details Below:
            `,
            realtimeEvent
          );
          logger.debug(client.conversation.responses);
        } else if (realtimeEvent.source === 'client') {
          logger.log(
            `
            +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            + [CLIENT] SENT "${realtimeEvent.event.type}" event to SERVER
            +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            + Event ID: ${realtimeEvent.event.event_id}
            + Item ID: ${realtimeEvent.event.item?.id}
            + Event Details Below:
            `,
            realtimeEvent
          );
          logger.debug(client.conversation.responses);
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
          logger.debug(
            `[DEBUG] Response count: ${client.conversation.responses.length}`
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
        logger.log(
          `[CONVERSATION] UPDATE --- Item ID: ${item.id}; Status: ${item.status}; ¶¶¶¶¶ HAS AUDIO DELTA: ${!!delta?.audio} ¶¶¶¶¶`
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
      logger.log('Cleaning up core setup');
      // Clean up event listeners and reset client
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        client.off(event, handler);
      });
      // Cleanup audio resources
      if (wavStreamPlayer) {
        wavStreamPlayer.interrupt();
      }
      // cleanup; resets to defaults
      client.reset();
    };
  }, [isInitialized, clientRef]);
  // }, [isInitialized, clientRef, wavRecorderRef, wavStreamPlayerRef]);

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

  useEffect(() => {
    logger.log('====== CURRENT SCREEN:', currentScreen, '======');
    // logger.log('Current screen:', currentScreen); // Add logging
  }, [currentScreen]);

  /* ---------------------------------------------------------------- */

  const handleStart = async () => {
    logger.log('=== Handling START - pre-try ===');
    try {
      logger.debug('[DEBUG] clientRef current state:', clientRef.current); // Add this
      logger.debug('[DEBUG] apiKey state:', apiKey); // Add this
      logger.log('--- Connecting conversation ---');
      await connectConversation();
      logger.log('--- Connection successful ---');
      logger.debug('[DEBUG] Setting current screen to voiceChat');
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
      setError(error as Error);
    }
  };

  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */

  // Main render function with proper state handling
  if (!isInitialized || isLoading) {
    return <LoadingState error={error} isLoading={isLoading} />;
  }

  return (
    <div
      id="main-page-root"
      className="flex flex-col flex-1 flex-grow overflow-auto bg-white absolute top-0 left-0 right-0 bottom-0 overflow-auto"
    >
      {/* Settings Button - Only show when NOT on results screen */}
      {/* {currentScreen !== 'results' && (
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
      )} */}

      {/* Settings Menu - Only show when NOT on results screen */}
      {/* {showSettings && currentScreen !== 'results' && (
        <SettingsMenu
          canPushToTalk={canPushToTalk}
          changeTurnEndType={changeTurnEndType}
          fullCleanup={fullCleanup}
        />
      )} */}

      {/* Landing Screen */}
      {currentScreen === 'landing' && (
        <LandingScreen
          onStart={async () => {
            try {
              // await connectConversation();
              // setCurrentScreen('voiceChat');
              logger.debug('[DEBUG] START Button clicked - immediate feedback');
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
          showSettings={showSettings}
          items={items}
          error={error}
          wavRecorderRef={wavRecorderRef}
          wavStreamPlayerRef={wavStreamPlayerRef}
          setShowConversation={setShowConversation}
          setShowSettings={setShowSettings}
          startRecording={startRecording}
          stopRecording={stopRecording}
          handleManualReportGeneration={handleManualReportGeneration}
          deleteConversationItem={deleteConversationItem}
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
              setError(error as Error);
            }
          }}
        />
      )}

      {/* Global Error Display - shows app-level errors */}
      {currentScreen !== 'voiceChat' && <ErrorDisplay error={error} />}
    </div>
  );
}
