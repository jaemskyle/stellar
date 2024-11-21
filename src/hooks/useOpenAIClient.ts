// src/hooks/useOpenAIClient.ts

import { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import type { CTG_TOOL_DEFINITION } from '../lib/ctg-tool';
import type { REPORT_TOOL_DEFINITION } from '../lib/report-handler';

// Keep the same URL constant from ConsolePage
const LOCAL_RELAY_SERVER_URL: string =
  import.meta.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

export function useOpenAIClient() {
  // Direct port of state from ConsolePage
  const [apiKey, setApiKey] = useState<string>('');
  const clientRef = useRef<RealtimeClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Direct port of resetAPIKey
  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  // Fetch API key effect - direct port
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

  // Initialize client effect - direct port
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

  return {
    apiKey,
    clientRef,
    isConnected,
    setIsConnected,
    resetAPIKey,
  };
}
