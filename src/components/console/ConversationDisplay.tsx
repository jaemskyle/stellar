// src/components/console/ConversationDisplay.tsx

import React, { useEffect, useCallback } from 'react';
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';

interface ConversationDisplayProps {
  items: ItemType[];
  onDeleteItem: (id: string) => void;
  className?: string;
}

export function ConversationDisplay({
  items,
  onDeleteItem,
  className = '',
}: ConversationDisplayProps) {
  // Auto-scroll effect - exact port from ConsolePageOG
  useEffect(() => {
    document.querySelectorAll('[data-conversation-content]').forEach(el => {
      (el as HTMLDivElement).scrollTop = el.scrollHeight;
    });
  }, [items]);

  // Missing cleanup on unmount
  useEffect(() => {
    return () => {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Missing error boundary for audio playback
  const handleAudioError = useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      console.error('Audio playback error:', event);
    },
    []
  );

  return (
    <div className={`content-block conversation ${className}`}>
      <div className="content-block-title">conversation</div>
      <div className="content-block-body" data-conversation-content>
        {!items.length && `awaiting connection...`}
        {items.map(conversationItem => (
          <div className="conversation-item" key={conversationItem.id}>
            <div className={`speaker ${conversationItem.role || ''}`}>
              <div>
                {(conversationItem.role || conversationItem.type).replaceAll(
                  '_',
                  ' '
                )}
              </div>
              <div
                className="close"
                onClick={() => onDeleteItem(conversationItem.id)}
              >
                <b>Delete</b>
              </div>
            </div>
            <div className={`speaker-content`}>
              {/* tool response - exact match to ConsolePageOG */}
              {conversationItem.type === 'function_call_output' && (
                <div>{conversationItem.formatted.output}</div>
              )}

              {/* tool call - exact match */}
              {!!conversationItem.formatted.tool && (
                <div>
                  {conversationItem.formatted.tool.name}(
                  {conversationItem.formatted.tool.arguments})
                </div>
              )}

              {/* user message - exact match */}
              {!conversationItem.formatted.tool &&
                conversationItem.role === 'user' && (
                  <div>
                    {conversationItem.formatted.transcript ||
                      (conversationItem.formatted.audio?.length
                        ? '(awaiting transcript)'
                        : conversationItem.formatted.text || '(item sent)')}
                  </div>
                )}

              {/* assistant message - exact match */}
              {!conversationItem.formatted.tool &&
                conversationItem.role === 'assistant' && (
                  <div>
                    {conversationItem.formatted.transcript ||
                      conversationItem.formatted.text ||
                      '(truncated)'}
                  </div>
                )}

              {/* audio playback - exact match */}
              {conversationItem.formatted.file && (
                <audio
                  src={conversationItem.formatted.file.url}
                  controls
                  onError={handleAudioError}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
