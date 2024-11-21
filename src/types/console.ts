/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Core API types for OpenAI client integration
 */
// src/types/console.ts

import type { RealtimeClient } from '@openai/realtime-api-beta';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';

/**
 * Direct port of the event type from ConsolePage.tsx
 */
export interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}
