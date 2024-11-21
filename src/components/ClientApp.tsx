// src/components/ClientApp.tsx

import { useState, useEffect, useRef } from 'react';
import { Mic, Eye, EyeOff, PhoneOff, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import existing functionality
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { instructions } from '@/utils/conversation_config';
import {
  getClinicalTrials,
  type StudyInfo,
  CTG_TOOL_DEFINITION,
} from '@/lib/ctg-tool';
import {
  reportHandler,
  REPORT_TOOL_DEFINITION,
  type TrialsReport,
} from '@/lib/report-handler';

// Types
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

export function ClientApp() {
  // Screen Management
  const [currentScreen, setCurrentScreen] = useState<
    'landing' | 'voiceChat' | 'results'
  >('landing');

  // Core State (from ConsolePage)
  const [apiKey, setApiKey] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);

  // Conversation State
  const [showConversation, setShowConversation] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({});

  // Results State
  const [activeTab, setActiveTab] = useState('results');
  const [trials, setTrials] = useState<StudyInfo[]>([]);
  const [isLoadingTrials, setIsLoadingTrials] = useState(false);
  const [finalReport, setFinalReport] = useState<TrialsReport | null>(null);

  // Refs
  const clientRef = useRef<RealtimeClient | null>(null);
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize API key and client
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        if (!data.apiKey) {
          throw new Error('No API key found in configuration');
        }
        setApiKey(data.apiKey);
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    if (apiKey) {
      clientRef.current = new RealtimeClient({
        apiKey,
        dangerouslyAllowAPIKeyInBrowser: true,
      });
    }
  }, [apiKey]);

  // Tool Setup
  const setupTools = useCallback(() => {
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
                'The key of the memory value. Always use lowercase and underscores.',
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
        setMemoryKv(prev => ({ ...prev, [key]: value }));
        return { ok: true };
      }
    );

    // Clinical Trials Tool
    client.addTool(CTG_TOOL_DEFINITION, async (params: any) => {
      try {
        setIsLoadingTrials(true);
        const trials = await getClinicalTrials(params);
        reportHandler.updateLatestTrials(trials, params);
        setTrials(trials);
        return {
          status: 'success',
          resultCount: trials.length,
          trials,
          message: `Successfully retrieved ${trials.length} clinical trials matching your criteria.`,
        };
      } catch (error) {
        console.error('Error fetching trials:', error);
        return {
          status: 'error',
          error: 'Failed to fetch clinical trials',
        };
      } finally {
        setIsLoadingTrials(false);
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
        setCurrentScreen('results');
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
        };
      }
    });

    client.updateSession();
  }, []);

  // Initialize tools when client is ready
  useEffect(() => {
    setupTools();
  }, [setupTools]);

  // Handle Conversation Connection
  const startConversation = useCallback(async () => {
    if (!clientRef.current) return;

    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    try {
      // Setup session
      client.updateSession({
        instructions,
        input_audio_transcription: { model: 'whisper-1' },
      });

      // Connect audio
      await wavRecorder.begin();
      await wavStreamPlayer.connect();

      // Connect to API
      await client.connect();
      setIsConnected(true);

      // Initial response
      client.createResponse();

      // Setup recording if using VAD
      if (client.getTurnDetectionType() === 'server_vad') {
        await wavRecorder.record(data => client.appendInputAudio(data.mono));
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }, []);

  // Recording Controls
  const startRecording = async () => {
    if (!clientRef.current) return;

    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    const trackSampleOffset = wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      client.cancelResponse(
        trackSampleOffset.trackId,
        trackSampleOffset.offset
      );
    }

    await wavRecorder.record(data => client.appendInputAudio(data.mono));

    setConversation(prev => [
      ...prev,
      { role: 'system', content: 'Recording started...' },
    ]);
  };

  const stopRecording = async () => {
    if (!clientRef.current) return;

    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;

    await wavRecorder.pause();
    client.createResponse();

    setConversation(prev => [
      ...prev,
      { role: 'system', content: 'Recording stopped...' },
    ]);
  };
  // src/components/ClientApp.tsx (continued...)

  // Voice Activity Visualization
  useEffect(() => {
    if (!visualizerRef.current || !isRecording) return;

    const canvas = visualizerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw circular visualization
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  // Conversation Event Handling
  useEffect(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    const eventHandlers = {
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

        // Update conversation messages
        if (item.role && (item.formatted.transcript || item.formatted.text)) {
          setConversation(prev => [
            ...prev,
            {
              id: item.id,
              role: item.role,
              content: item.formatted.transcript || item.formatted.text,
            },
          ]);
        }
      },
    };

    // Attach event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      client.on(event, handler);
    });

    return () => {
      client.reset();
    };
  }, [clientRef.current]);

  // Screen Components
  const LandingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h1 className="text-5xl font-bold leading-tight mb-6">
        Find the Right Clinical Trial, Anywhere, Anytime
      </h1>
      <p className="text-lg text-gray-600 mb-16 max-w-2xl">
        Search for trials in your language, tailored to your knowledge level.
        Simplifying access for patients and caregivers worldwide
      </p>
      <div className="flex flex-col items-center">
        <p className="text-sm mb-4">Tap to start</p>
        <button
          onClick={async () => {
            await startConversation();
            setCurrentScreen('voiceChat');
          }}
          className="w-20 h-20 rounded-full bg-black hover:bg-gray-800 transition-colors flex items-center justify-center"
        >
          <Mic className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );

  const VoiceChatScreen = () => {
    const toggleRecording = async () => {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    };

    return (
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
            {conversation.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`mb-2 ${
                  msg.role === 'system'
                    ? 'text-gray-500'
                    : msg.role === 'assistant'
                      ? 'text-blue-600'
                      : 'text-green-600'
                }`}
              >
                <strong>{msg.role}:</strong> {msg.content}
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
              onClick={toggleRecording}
            >
              {isRecording ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
            <span className="text-sm text-gray-600">
              {isRecording ? 'Stop' : 'Record'}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 mb-2"
              onClick={() => setCurrentScreen('results')}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <span className="text-sm text-gray-600">End Chat</span>
          </div>
        </div>
      </div>
    );
  };

  const ResultsScreen = () => (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-4xl font-bold text-center mb-4">
        Consult with your healthcare professional
      </h1>
      <p className="text-gray-600 text-center mb-8">
        {isLoadingTrials
          ? 'Searching for trials...'
          : trials.length > 0
            ? `We found ${trials.length} trials. Here are the top ${Math.min(5, trials.length)} matches`
            : 'No trials found matching your criteria.'}
      </p>

      <Button
        className="mb-8 bg-gray-900 text-white"
        onClick={async () => {
          await startConversation();
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
              {trials.slice(0, 5).map(trial => (
                <div
                  key={trial.nctNumber}
                  className="mb-4 p-4 rounded-lg bg-gray-50"
                >
                  <p className="font-mono text-sm text-gray-600">
                    {trial.nctNumber}
                  </p>
                  <p className="text-gray-900">{trial.studyTitle}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Status: {trial.status}
                  </p>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="info">
            <div className="rounded-md border p-4">
              {Object.entries(memoryKv).map(([key, value]) => (
                <div key={key} className="mb-2">
                  <span className="font-medium">{key}:</span> {value}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // Main Render
  return (
    <div className="min-h-screen bg-white">
      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'voiceChat' && <VoiceChatScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
    </div>
  );
}
