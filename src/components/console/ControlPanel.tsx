import React from 'react';
import { Button } from '@/components/button/Button';
import { Toggle } from '@/components/toggle/Toggle';

interface ControlPanelProps {
  isConnected: boolean;
  isRecording: boolean;
  canPushToTalk: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  changeTurnEndType: (value: string) => Promise<void>;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onGenerateReport: () => Promise<void>;
  hasTrials: boolean;
  isReportLoading?: boolean;
}

export function ControlPanel({
  isConnected,
  isRecording,
  canPushToTalk,
  startRecording,
  stopRecording,
  changeTurnEndType,
  onConnect,
  onDisconnect,
  onGenerateReport,
  hasTrials,
  isReportLoading,
}: ControlPanelProps) {
  return (
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
        label={isConnected ? 'disconnect & reset' : 'connect'}
        buttonStyle={isConnected ? 'regular' : 'action'}
        onClick={isConnected ? onDisconnect : onConnect}
      />
      <div className="spacer" />
      {isConnected && (
        <Button
          label="End Chat & Generate Report"
          buttonStyle="action"
          onClick={onGenerateReport}
          disabled={!hasTrials || isReportLoading}
        />
      )}
    </div>
  );
}
