import React from 'react';

interface StatusIndicatorProps {
  isConnected: boolean;
  isRecording: boolean;
  hasError: boolean;
}

/**
 * StatusIndicator displays the current connection and recording status
 * with a colored dot and descriptive text.
 *
 * @param isConnected - Whether the app is connected to the server
 * @param isRecording - Whether audio is currently being recorded
 * @param hasError - Whether there's an error state
 */
export function StatusIndicator({
  isConnected,
  isRecording,
  hasError,
}: StatusIndicatorProps) {
  return (
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
}
