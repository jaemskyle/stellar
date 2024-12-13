/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/console.ts

import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import type { StudyInfo } from '@/lib/ctgtool/ctg-tool';
import type { TrialsReport } from '@/lib/report-handler';
import type { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';

/**
 * Direct port of the event type from ConsolePageOG
 */
export interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

/**
 * Memory key-value store type
 */
export type MemoryKV = { [key: string]: any };

/**
 * Core state interfaces from ConsolePageOG
 */
export interface ConsoleState {
  // Client state
  isConnected: boolean;

  // Conversation state
  items: ItemType[];
  memoryKv: MemoryKV;

  // Event state
  realtimeEvents: RealtimeEvent[];
  expandedEvents: Record<string, boolean>;

  // Trials state
  trials: StudyInfo[];
  isLoadingTrials: boolean;

  // Report state
  finalReport: TrialsReport | null;
  isReportModalOpen: boolean;
}

/**
 * Event handlers that match ConsolePageOG
 */
export interface ConsoleEventHandlers {
  onEventClick: (_eventId: string) => void;
  onDeleteItem: (_id: string) => void;
  onDisconnect: () => Promise<void>;
  onConnect: () => Promise<void>;
  onGenerateReport: () => Promise<void>;
}

/**
 * Audio control handlers from ConsolePageOG
 */
export interface AudioControls {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  changeTurnEndType: (_value: string) => Promise<void>;
}

/**
 * Props for the main Console component
 */
export interface ConsoleProps {
  apiKey?: string;
  onResetApiKey?: () => void;
  initialState?: Partial<ConsoleState>;
}

/**
 * Audio visualization context
 */
export interface AudioVisualizationContext {
  wavRecorder: WavRecorder | null;
  wavStreamPlayer: WavStreamPlayer | null;
  clientCanvas: HTMLCanvasElement | null;
  serverCanvas: HTMLCanvasElement | null;
  clientCtx: CanvasRenderingContext2D | null;
  serverCtx: CanvasRenderingContext2D | null;
}

/**
 * Audio processing events for tracking state
 */
export type AudioProcessingEvents = 'start' | 'stop' | 'error' | 'vad_change';

/**
 * Audio processor state
 */
export interface AudioProcessorState {
  isRecording: boolean;
  canPushToTalk: boolean;
  isAudioInitialized: boolean;
}

/**
 * Audio visualization props
 */
export interface AudioVisualizerProps {
  recorder: WavRecorder | null;
  player: WavStreamPlayer | null;
  clientColor?: string;
  serverColor?: string;
}

/**
 * Event display props
 */
export interface EventDisplayProps {
  events: RealtimeEvent[];
  expandedEvents: Record<string, boolean>;
  onEventClick: (_eventId: string) => void;
  formatTime: (_timestamp: string) => string;
  wavRecorder: WavRecorder | null;
  wavStreamPlayer: WavStreamPlayer | null;
  eventsScrollRef?: React.RefObject<HTMLDivElement>;
  className?: string;
}

/**
 * Event item props
 */
export interface EventItemProps {
  event: RealtimeEvent;
  isExpanded: boolean;
  onEventClick: (eventId: string) => void; // Make parameter name consistent
  formatTime: (_timestamp: string) => string;
}

/**
 * Event handling context
 */
export interface EventHandlingContext {
  setRealtimeEvents: React.Dispatch<React.SetStateAction<RealtimeEvent[]>>;
  setExpandedEvents: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  addEvent: (_event: Omit<RealtimeEvent, 'time'>) => void;
  clearEvents: () => void;
  // Add missing event handling types
  realtimeEvents: RealtimeEvent[];
  expandedEvents: Record<string, boolean>;
  handleEventClick: (eventId: string) => void;
}
