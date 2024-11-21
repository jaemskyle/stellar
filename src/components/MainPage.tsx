/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/MainPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { Mic, Eye, EyeOff, PhoneOff, MicOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import all the required utilities and tools
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';
import { WavRenderer } from '@/utils/wav_renderer';
import { instructions } from '@/utils/model_instructions.js';
import {
  CTG_TOOL_DEFINITION,
  getClinicalTrials,
  type StudyInfo,
} from '../lib/ctg-tool';
import {
  reportHandler,
  REPORT_TOOL_DEFINITION,
  type TrialsReport,
} from '../lib/report-handler';

// Import components
import TrialsDisplay from './TrialsDisplay';
import ReportModal from '@/components/ReportModal';

// Constants
const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

// Types
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

export default function MainPage() {
  // Screen Management from App.tsx
  const [currentScreen, setCurrentScreen] = useState('landing');

  // Core State from ConsolePageOG
  const [apiKey, setApiKey] = useState<string>('');
  const clientRef = useRef<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Conversation and Memory State
  const [items, setItems] = useState<ItemType[]>([]);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);

  // UI State
  const [showConversation, setShowConversation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('results');

  // Audio State and Refs
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Trials and Report State
  const [trials, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // UI Refs
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const eventsScrollHeightRef = useRef(0);

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

  // Continue with Part 2b for Effects and UI Components...
  // ... continuing from Part 2a

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

  useEffect(() => {
    document.querySelectorAll('[data-conversation-content]').forEach(el => {
      (el as HTMLDivElement).scrollTop = el.scrollHeight;
    });
  }, [items]);

  // Audio Visualization Effect
  useEffect(() => {
    if (!visualizerRef.current || !isRecording) return;

    const canvas = visualizerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isLoaded = true;

    const animate = () => {
      if (!isLoaded || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw base circle
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 50, 0, 2 * Math.PI);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animate waves when recording
      if (isRecording) {
        const time = Date.now() / 1000;
        const numWaves = 3;
        for (let i = 0; i < numWaves; i++) {
          const radius = 50 + Math.sin(time * 2 + i) * 10;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(100, 100, 100, ${0.3 - i * 0.1})`;
          ctx.stroke();
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isLoaded = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  // Settings Menu Component
  const SettingsMenu = () => (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4">
      <h3 className="font-semibold mb-2">Settings</h3>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetAPIKey}
          className="w-full"
        >
          Reset API Key
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            changeTurnEndType(canPushToTalk ? 'server_vad' : 'none')
          }
          className="w-full"
        >
          {canPushToTalk ? 'Switch to VAD' : 'Switch to Push-to-Talk'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fullCleanup}
          className="w-full text-red-600"
        >
          Reset Everything
        </Button>
      </div>
    </div>
  );

  // Update VoiceChatScreen to include conversation item deletion
  const ConversationItem = ({ item }: { item: ItemType }) => (
    <div className="relative group">
      <div
        className={`mb-2 ${
          item.role === 'system'
            ? 'text-gray-500'
            : item.role === 'assistant'
              ? 'text-blue-600'
              : 'text-green-600'
        }`}
      >
        <strong>{item.role}:</strong>{' '}
        {item.formatted.transcript || item.formatted.text}
        <button
          onClick={() => deleteConversationItem(item.id)}
          className="absolute -right-4 top-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );

  // UI Components
  const LandingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-5xl font-bold leading-tight mb-6">
        Find the Right Clinical Trial, Anywhere, Anytime
      </h1>
      <p className="text-lg text-gray-600 mb-16 max-w-2xl">
        Search for trials in your language, tailored to your knowledge level.
      </p>
      <div className="flex flex-col items-center">
        <p className="text-sm mb-4">Tap to start</p>
        <Button
          variant="outline"
          size="icon"
          className="w-20 h-20 rounded-full"
          onClick={async () => {
            await connectConversation();
            setCurrentScreen('voiceChat');
          }}
        >
          <Mic className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );

  const VoiceChatScreen = () => (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-12">Clinical Trial Finder</h1>

      <div className="flex-grow flex items-center justify-center w-full">
        <canvas
          ref={visualizerRef}
          className="w-32 h-32"
          width={128}
          height={128}
        />
      </div>

      {showConversation && (
        <ScrollArea className="w-full max-w-md h-48 mb-8 border rounded-lg p-4">
          {items.map(item => (
            <div
              key={item.id}
              className={`mb-2 ${
                item.role === 'system'
                  ? 'text-gray-500'
                  : item.role === 'assistant'
                    ? 'text-blue-600'
                    : 'text-green-600'
              }`}
            >
              <strong>{item.role}:</strong>{' '}
              {item.formatted.transcript || item.formatted.text}
            </div>
          ))}
        </ScrollArea>
      )}

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
            className="rounded-full w-12 h-12 mb-2"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            disabled={!isConnected || !canPushToTalk}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
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
            onClick={async () => {
              await handleManualReportGeneration();
              setCurrentScreen('results');
            }}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <span className="text-sm text-gray-600">End Chat</span>
        </div>
      </div>
    </div>
  );

  const ResultsScreen = () => (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-4xl font-bold text-center mb-4">
        Clinical Trial Results
      </h1>
      <p className="text-gray-600 text-center mb-8">
        We found {trials.length} matching trials
      </p>

      <Button
        className="mb-8 bg-gray-900 text-white"
        onClick={async () => {
          await connectConversation();
          setCurrentScreen('voiceChat');
        }}
      >
        <Mic className="w-4 h-4 mr-2" />
        Start another search
      </Button>

      <div className="w-full max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="info">Your information</TabsTrigger>
          </TabsList>
          <TabsContent value="results">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <TrialsDisplay trials={trials} isLoading={isLoadingTrials} />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="info">
            <div className="rounded-md border p-4">
              <pre className="text-sm">{JSON.stringify(memoryKv, null, 2)}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ReportModal
        report={finalReport}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );

  // Main Render
  return (
    <div className="min-h-screen bg-white relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={() => setShowSettings(!showSettings)}
      >
        <Settings className="w-5 h-5" />
      </Button>

      {showSettings && <SettingsMenu />}

      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'voiceChat' && <VoiceChatScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
    </div>
  );
}
