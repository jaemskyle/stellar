import React from 'react';

interface VadToggleProps {
  canPushToTalk: boolean;
  onChange: (value: string) => void;
}

export function VadToggle({ canPushToTalk, onChange }: VadToggleProps) {
  return (
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
}
