/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * src/components/ConsolePageOG.tsx - Original ConsolePage Component
 *
 * This component handles the connection to the OpenAI Realtime API,
 * manages conversation state, and renders the clinical trials research UI.
 *
 * Local Relay Server Configuration:
 * - Set REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 * - Requires OPENAI_API_KEY in .env file
 * - Run with `npm run relay` parallel to `npm start`
 */

// Core dependencies
import React, { useEffect, useRef, useCallback, useState } from 'react';

// External utilities
import { logger } from '@/utils/logger';

import { ScrollArea } from '@/components/ui/scroll-area';

// External libraries
import { RealtimeClient } from '@openai/realtime-api-beta';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';

// Internal utilities
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';
import { WavRenderer } from '@/utils/wav_renderer';
import { instructions } from '@/utils/model_instructions.js';

// Icons
import { Eye, EyeOff, Mic, MicOff, PhoneOff, Settings } from 'lucide-react';

// Features
import {
  CTG_TOOL_DEFINITION,
  getClinicalTrials,
  type StudyInfo,
} from '../lib/ctgtool/ctg-tool';
import {
  reportHandler,
  REPORT_TOOL_DEFINITION,
  type TrialsReport,
} from '../lib/report-handler';

// Components
import TrialsDisplay from './TrialsDisplay';
import ReportModal from '@/components/ReportModal';
import { Button } from '@/components/button/Button';
import { Toggle } from '@/components/toggle/Toggle';

// Styles
import './ConsolePage.scss';

// Constants
const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

/**
 * Type for all event logs.
 */
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

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

/**
 * The main component for the console page.
 * This component handles the connection to the OpenAI Realtime API,
 * manages the state of the conversation, and renders the UI.
 */
export function ConsolePageOG() {
  /**
   * State Management Section
   * Organized by functionality for better code organization
   */

  // API and Client State
  const [apiKey, setApiKey] = useState<string>('');
  // Initialize client ref with null and update it when apiKey is available
  const clientRef = useRef<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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

  /**
   * All of our variables for displaying application state:
   * - items are all conversation items (dialog)
   * - realtimeEvents are event logs, which can be expanded
   * - memoryKv is for set_memory() function
   * - trials and isLoadingTrials are for get_trials() function
   */
  // Conversation State
  const [items, setItems] = useState<ItemType[]>([]);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});

  // Event Logging State
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const startTimeRef = useRef<string>(new Date().toISOString());

  // UI References
  /**
   * References for:
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);

  // Trials and Report State
  const [trials, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  /**
   * Utility Functions
   * Helper functions for formatting and general purpose use
   */
  // Utility for formatting the timing of logs
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

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

  /**
   * Tool Management
   * Handles setup and configuration of available tools
   */
  const addTools = useCallback(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;

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
        setIsReportModalOpen(true); // Open modal when assistant generates report

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

    // Update session after adding tools
    client.updateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientRef]);

  /**
   * Connection Management
   * Connect to conversation:
   * Handles establishing and terminating connections
   * WavRecorder takes speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    console.log('jkd connectConversation', '==clientRef', clientRef);
    console.log(
      'jb === !clientRef.current gets resolved to',
      !clientRef.current
    );
    if (!clientRef.current) return;

    // if clientRef.current.tools object is empty trigger addTools
    const toolsList = Object.keys(clientRef.current.tools);
    const client = clientRef.current;

    if (toolsList.length === 0) {
      addTools();

      // Update session after adding tools
      client.updateSession();
    }

    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    console.log('jb connectConversation', '==client.connect()');
    await client.connect();
    console.log('jb connectConversation', '==client.connect() done');
    // client.sendUserMessageContent([
    //   {
    //     type: `input_text`,
    //     text: `Hello! I'm looking for clinical trials that might be suitable for me.`,
    //   },
    // ]);
    console.log('Forcing model response generation');
    client.createResponse();
    console.log('Model response creation complete');

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record(data => client.appendInputAudio(data.mono));
    }

    console.log('Connected to conversation');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientRef]);

  /**
   * Disconnect and reset conversation state
   * Cleans up all connections and resets state
   */
  const disconnectConversation = useCallback(async () => {
    if (!clientRef.current) return;

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
    if (!clientRef.current) return;

    setIsRecording(true);
    const client = clientRef.current;
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
    if (!clientRef.current) return;

    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  /**
   * Switch between Manual <> VAD mode for communication
   * Handles turn detection type changes
   */
  const changeTurnEndType = async (value: string) => {
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
  };

  /**
   * Report Management
   * Handles manual report generation and conversation end
   */
  const handleManualReportGeneration = useCallback(async () => {
    if (!reportHandler.getLatestTrials().length) {
      console.warn('No trials available for report generation');
      return;
    }

    try {
      // Generate report first
      const report = reportHandler.generateReport(
        memoryKv,
        'user',
        true // mark as complete since user is ending conversation
      );
      setFinalReport(report);
      console.log('Report set:', report);
      setIsReportModalOpen(true); // Open modal after report generation
      console.log('Report modal opened');

      // Then disconnect conversation
      await disconnectConversation();

      console.log('Report generated and conversation ended by user');
    } catch (error) {
      console.error('Error during report generation:', error);
      // Optionally show error to user
    }
  }, [memoryKv, disconnectConversation]);

  /**
   * Delete a conversation item by its ID.
   *
   * @param id - The ID of the item to delete.
   */
  const deleteConversationItem = useCallback(
    async (id: string) => {
      if (!clientRef.current) return;

      const client = clientRef.current;
      client.deleteItem(id);
    },
    [clientRef]
  );

  /**
   * Effect Hooks
   * Organized by initialization order and dependencies
   */

  /**
   * API and Client Initialization
   * Ask user for API Key.
   * If we're using the local relay server, we don't need this.
   */
  // Fetch API key on component mount
  useEffect(() => {
    async function fetchConfig() {
      try {
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
  }, []);

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

  /**
   * Tool and Core Setup
   */
  useEffect(() => {
    addTools();
  }, [addTools]); // ? jb
  // }, [apiKey, addTools]); // ? jkd

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    console.log('Starting RealtimeClient setup and connection to conversation');
    if (!clientRef.current) return;

    // Get refs
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Initialize session settings
    // Set instructions
    console.log('Setting instructions and transcription model:', instructions, {
      model: 'whisper-1',
    });

    client.updateSession({ instructions: instructions });
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // Event handlers setup
    // handle realtime events from client + server for event logging
    console.log('Setting up event listeners');
    const eventHandlers = {
      'realtime.event': (realtimeEvent: RealtimeEvent) => {
        setRealtimeEvents(events => {
          const lastEvent = events[events.length - 1];
          if (lastEvent?.event.type === realtimeEvent.event.type) {
            lastEvent.count = (lastEvent.count || 0) + 1;
            return events.slice(0, -1).concat(lastEvent);
          } else {
            return events.concat(realtimeEvent);
          }
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
        setItems(client.conversation.getItems());
      },
    };

    // Attach event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      client.on(event, handler);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset(); // cleanup; resets to defaults
    };
  }, [apiKey, clientRef]);

  /**
   * UI Effects
   * Auto-scroll the event logs
   */
  useEffect(() => {
    if (!eventsScrollRef.current) return;
    const eventsEl = eventsScrollRef.current;
    const scrollHeight = eventsEl.scrollHeight;
    if (scrollHeight !== eventsScrollHeightRef.current) {
      eventsEl.scrollTop = scrollHeight;
      eventsScrollHeightRef.current = scrollHeight;
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  // useEffect(() => {
  //   const conversationEls = [].slice.call(
  //     document.body.querySelectorAll('[data-conversation-content]')
  //   );
  //   for (const el of conversationEls) {
  //     const conversationEl = el as HTMLDivElement;
  //     conversationEl.scrollTop = conversationEl.scrollHeight;
  //   }
  // }, [items]);
  useEffect(() => {
    document.querySelectorAll('[data-conversation-content]').forEach(el => {
      (el as HTMLDivElement).scrollTop = el.scrollHeight;
    });
  }, [items]);

  /**
   * Visualization Effect
   * Set up render loops for the visualization canvas
   *
   * This is where the audio visualization is rendered.
   */
  useEffect(() => {
    let isLoaded = true;
    const renderContext = {
      wavRecorder: wavRecorderRef.current,
      wavStreamPlayer: wavStreamPlayerRef.current,
      clientCanvas: clientCanvasRef.current,
      serverCanvas: serverCanvasRef.current,
      clientCtx: null as CanvasRenderingContext2D | null,
      serverCtx: null as CanvasRenderingContext2D | null,
    };

    function renderCanvas(
      canvas: HTMLCanvasElement | null,
      ctx: CanvasRenderingContext2D | null,
      source: any,
      color: string
    ) {
      if (!canvas) return null;

      if (!canvas.width || !canvas.height) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }

      ctx = ctx || canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const values =
        source.getFrequencies?.('voice')?.values || new Float32Array([0]);

      WavRenderer.drawBars(canvas, ctx, values, color, 10, 0, 8);
      return ctx;
    }

    function render() {
      if (!isLoaded) return;

      renderContext.clientCtx = renderCanvas(
        renderContext.clientCanvas,
        renderContext.clientCtx,
        renderContext.wavRecorder.recording ? renderContext.wavRecorder : {},
        '#0099ff'
      );

      renderContext.serverCtx = renderCanvas(
        renderContext.serverCanvas,
        renderContext.serverCtx,
        renderContext.wavStreamPlayer.analyser
          ? renderContext.wavStreamPlayer
          : {},
        '#009900'
      );

      window.requestAnimationFrame(render);
    }

    render();
    return () => {
      isLoaded = false;
    };
  }, []);

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
            logger.log('Button clicked - immediate feedback');
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

  const ErrorDisplay = ({ error }: { error: Error | null }) => {
    if (!error) return null;

    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
        {error?.message}
      </div>
    );
  };

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

      {/* <div className="flex-grow flex items-center justify-center w-full">
        <AudioVisualization
          isRecording={isRecording}
          wavRecorderRef={wavRecorderRef}
          wavStreamPlayerRef={wavStreamPlayerRef}
        />
      </div> */}

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

  /**
   * Render the application UI
   */
  return (
    <div data-component="ConsolePage">
      <LandingScreen
        onStart={async () => {
          try {
            logger.debug('DEBUG: START Button clicked - immediate feedback');
            connectConversation();
          } catch (err) {
            // setError(err as Error);
          }
        }}
      />

      <VoiceChatScreen
        isConnected={isConnected}
        isRecording={isRecording}
        canPushToTalk={canPushToTalk}
        showConversation={false} //{showConversation}
        hasError={false} //{!!error}
        error={null} //{error}
        items={items}
        startRecording={startRecording}
        stopRecording={stopRecording}
        setShowConversation={() => false} //{setShowConversation}
        handleManualReportGeneration={async () => {
          try {
            await handleManualReportGeneration();
          } catch (err) {
            // setError(err as Error);
          }
        }}
        wavRecorderRef={wavRecorderRef}
        wavStreamPlayerRef={wavStreamPlayerRef}
      />
      <div className="content-top">
        <div className="content-title">
          {/* <img src="/openai-logomark.svg" alt="OpenAI Logo" /> */}
          <span>Clinical Trials Research Assistant</span>
        </div>
        <div className="content-api-key">
          {!LOCAL_RELAY_SERVER_URL && (
            <Button
              // icon={Edit}
              // iconPosition="end"
              buttonStyle="flush"
              // label={`api key: ${apiKey.slice(0, 3)}...`}
              onClick={() => resetAPIKey()}
            />
          )}
        </div>
      </div>
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
            <div className="content-block-title">events</div>
            <div className="content-block-body" ref={eventsScrollRef}>
              {!realtimeEvents.length && `awaiting connection...`}
              {realtimeEvents.map(realtimeEvent => {
                const count = realtimeEvent.count;
                const event = { ...realtimeEvent.event };
                if (event.type === 'input_audio_buffer.append') {
                  event.audio = `[trimmed: ${event.audio.length} bytes]`;
                } else if (event.type === 'response.audio.delta') {
                  event.delta = `[trimmed: ${event.delta.length} bytes]`;
                }
                return (
                  <div className="event" key={event.event_id}>
                    <div className="event-timestamp">
                      {formatTime(realtimeEvent.time)}
                    </div>
                    <div className="event-details">
                      <div
                        className="event-summary"
                        onClick={() => {
                          // toggle event details
                          const id = event.event_id;
                          const expanded = { ...expandedEvents };
                          if (expanded[id]) {
                            delete expanded[id];
                          } else {
                            expanded[id] = true;
                          }
                          setExpandedEvents(expanded);
                        }}
                      >
                        <div
                          className={`event-source ${
                            event.type === 'error'
                              ? 'error'
                              : realtimeEvent.source
                          }`}
                        >
                          {realtimeEvent.source === 'client' ? (
                            <b>Up</b>
                          ) : (
                            <b>Down</b>
                          )}
                          <span>
                            {event.type === 'error'
                              ? 'error!'
                              : realtimeEvent.source}
                          </span>
                        </div>
                        <div className="event-type">
                          {event.type}
                          {count && ` (${count})`}
                        </div>
                      </div>
                      {!!expandedEvents[event.event_id] && (
                        <div className="event-payload">
                          {JSON.stringify(event, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content-block conversation">
            <div className="content-block-title">conversation</div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && `awaiting connection...`}
              {items.map(conversationItem => (
                <div className="conversation-item" key={conversationItem.id}>
                  <div className={`speaker ${conversationItem.role || ''}`}>
                    <div>
                      {(
                        conversationItem.role || conversationItem.type
                      ).replaceAll('_', ' ')}
                    </div>
                    <div
                      className="close"
                      onClick={() =>
                        deleteConversationItem(conversationItem.id)
                      }
                    >
                      <b>Delete</b>
                    </div>
                  </div>
                  <div className={`speaker-content`}>
                    {/* tool response */}
                    {conversationItem.type === 'function_call_output' && (
                      <div>{conversationItem.formatted.output}</div>
                    )}
                    {/* tool call */}
                    {!!conversationItem.formatted.tool && (
                      <div>
                        {conversationItem.formatted.tool.name}(
                        {conversationItem.formatted.tool.arguments})
                      </div>
                    )}
                    {!conversationItem.formatted.tool &&
                      conversationItem.role === 'user' && (
                        <div>
                          {conversationItem.formatted.transcript ||
                            (conversationItem.formatted.audio?.length
                              ? '(awaiting transcript)'
                              : conversationItem.formatted.text ||
                                '(item sent)')}
                        </div>
                      )}
                    {!conversationItem.formatted.tool &&
                      conversationItem.role === 'assistant' && (
                        <div>
                          {conversationItem.formatted.transcript ||
                            conversationItem.formatted.text ||
                            '(truncated)'}
                        </div>
                      )}
                    {conversationItem.formatted.file && (
                      <audio
                        src={conversationItem.formatted.file.url}
                        controls
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="content-actions">
            <Toggle
              defaultValue={false}
              labels={['manual', 'vad']}
              values={['none', 'server_vad']}
              onChange={(_, value) => changeTurnEndType(value)}
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? 'release to send' : 'push to talk'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? 'disconnect' : 'connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              // icon={isConnected ? "x" : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              // onClick={(e) => console.log("jkd connect", e)}
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

      {/* Consider updating button labels/states based on report existence */}
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
