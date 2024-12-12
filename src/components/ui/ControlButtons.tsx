import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mic, PhoneOff } from 'lucide-react';

interface ControlButtonsProps {
  showConversation: boolean;
  setShowConversation: (show: boolean) => void;
  isRecording: boolean;
  isConnected: boolean;
  canPushToTalk: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  handleManualReportGeneration: () => void;
}

export function ControlButtons({
  showConversation,
  setShowConversation,
  isRecording,
  isConnected,
  canPushToTalk,
  startRecording,
  stopRecording,
  handleManualReportGeneration,
}: ControlButtonsProps) {
  return (
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
          onClick={handleManualReportGeneration}
          disabled={!isConnected || isRecording}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
        <span className="text-sm text-gray-600">End Chat</span>
      </div>
    </div>
  );
}
