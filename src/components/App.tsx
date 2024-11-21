'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Eye, EyeOff, PhoneOff, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Trial {
  nctNumber: string;
  title: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [activeTab, setActiveTab] = useState('results');
  const [conversation, setConversation] = useState<Message[]>([]);
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const [trials] = useState<Trial[]>([
    {
      nctNumber: 'NCT01234567',
      title: 'Study of New Drug X for Type 2 Diabetes',
    },
    {
      nctNumber: 'NCT23456789',
      title: 'Evaluation of Treatment Z for Diabetic Neuropathy',
    },
    {
      nctNumber: 'NCT34567890',
      title: 'Clinical Trial of Therapy B for Diabetes Management',
    },
  ]);

  // Simulated voice activity visualization
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
          onClick={() => setCurrentScreen('voiceChat')}
          className="w-20 h-20 rounded-full bg-black hover:bg-gray-800 transition-colors flex items-center justify-center"
        >
          <Mic className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );

  const VoiceChatScreen = () => {
    const toggleRecording = () => {
      setIsRecording(!isRecording);
      if (!isRecording) {
        setConversation(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Recording started...',
          },
        ]);
      } else {
        setConversation(prev => [
          ...prev,
          {
            role: 'system',
            content: 'Recording stopped...',
          },
        ]);
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
                key={idx}
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
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
            <span className="text-sm text-gray-600">Mute</span>
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
            <span className="text-sm text-gray-600">Hang up</span>
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
        We found 15 trials. Here are the top 5 closest matches
      </p>

      <Button
        className="mb-8 bg-gray-900 text-white"
        onClick={() => setCurrentScreen('voiceChat')}
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
              {trials.map(trial => (
                <div
                  key={trial.nctNumber}
                  className="mb-4 p-4 rounded-lg bg-gray-50"
                >
                  <p className="font-mono text-sm text-gray-600">
                    {trial.nctNumber}
                  </p>
                  <p className="text-gray-900">{trial.title}</p>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="info">
            <div className="rounded-md border p-4">
              <p className="text-gray-600">
                Your search parameters and information will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'voiceChat' && <VoiceChatScreen />}
      {currentScreen === 'results' && <ResultsScreen />}
    </div>
  );
}
