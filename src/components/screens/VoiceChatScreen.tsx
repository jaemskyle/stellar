import React, { useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationView } from '@/components/conversation/ConversationView';
import { AudioVisualization } from '@/components/ui/AudioVisualization';
import { ControlButtons } from '@/components/ui/ControlButtons';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { logger } from '@/utils/logger';
import type {
  // InputTextContentType,
  ItemType,
} from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools/index.js';

interface VoiceChatScreenProps {
  // State props
  isConnected: boolean;
  isRecording: boolean;
  canPushToTalk: boolean;
  showConversation: boolean;
  showSettings: boolean;
  items: ItemType[];
  error: Error | null;

  // Refs
  wavRecorderRef: React.RefObject<WavRecorder>;
  wavStreamPlayerRef: React.RefObject<WavStreamPlayer>;

  // Event handlers
  setShowConversation: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  startRecording: () => void;
  stopRecording: () => void;
  handleManualReportGeneration: () => void;
  deleteConversationItem: (itemId: string) => void;
}

export function VoiceChatScreen({
  isConnected,
  isRecording,
  canPushToTalk,
  showConversation,
  showSettings,
  items,
  error,
  wavRecorderRef,
  wavStreamPlayerRef,
  setShowConversation,
  setShowSettings,
  startRecording,
  stopRecording,
  handleManualReportGeneration,
  deleteConversationItem,
}: VoiceChatScreenProps) {
  // Log element dimensions on mount and updates
  useEffect(() => {
    const mainPageElement = document.getElementById('main-page-root');
    if (mainPageElement) {
      logger.debug(
        'DEBUG: MainPage root clientHeight:',
        mainPageElement.clientHeight
      );
    }
  }, []);

  return (
    <div
      id="main-page-root"
      className="flex flex-col items-center justify-between _min-h-screen bg-background p-8 absolute top-0 left-0 right-0 bottom-0 overflow-auto"
    >
      
      {/* Status Indicator */}
      <div className="absolute top-4 left-4">
        <StatusIndicator
          isConnected={isConnected}
          isRecording={isRecording}
          hasError={!!error}
        />
      </div>

      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Settings Button */}
      {/* <div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div> */}

      <h1 className="text-2xl font-bold mb-12">Clinical Trial Finder</h1>

      <div className="flex-grow flex items-center justify-center w-full">
        <AudioVisualization
          isRecording={isRecording}
          wavRecorderRef={wavRecorderRef}
          wavStreamPlayerRef={wavStreamPlayerRef}
        />
      </div>

      <ConversationView
        items={items}
        showConversation={showConversation}
        onDeleteItem={deleteConversationItem}
      />

      <ControlButtons
        showConversation={showConversation}
        setShowConversation={setShowConversation}
        isRecording={isRecording}
        isConnected={isConnected}
        canPushToTalk={canPushToTalk}
        startRecording={startRecording}
        stopRecording={stopRecording}
        handleManualReportGeneration={handleManualReportGeneration}
      />
    </div>
  );
}
