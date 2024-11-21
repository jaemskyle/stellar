// src/components/console/EventLog.tsx

import React from 'react';
import type { RealtimeEvent } from '@/types/console';

interface EventLogProps {
  events: RealtimeEvent[];
  expandedEvents: Record<string, boolean>;
  onEventClick: (eventId: string) => void;
  formatTime: (timestamp: string) => string;
}

export function EventLog({
  events,
  expandedEvents,
  onEventClick,
  formatTime,
}: EventLogProps) {
  // Direct port of the event log rendering logic from ConsolePage
  return (
    <div className="content-block events">
      <div className="content-block-title">events</div>
      <div className="content-block-body">
        {!events.length && `awaiting connection...`}
        {events.map(realtimeEvent => {
          const count = realtimeEvent.count;
          const event = { ...realtimeEvent.event };
          if (event.type === 'input_audio_buffer.append') {
            event.audio = `[trimmed: ${event.audio.length} bytes]`;
          } else if (event.type === 'response.audio.delta') {
            event.delta = `[trimmed: ${event.delta.length} bytes]`;
          }
          return (
            <div className="event" key={event.event_id}>
              <div className="event-timestamp">
                {formatTime(realtimeEvent.time)}
              </div>
              <div className="event-details">
                <div
                  className="event-summary"
                  onClick={() => onEventClick(event.event_id)}
                >
                  <div
                    className={`event-source ${
                      event.type === 'error' ? 'error' : realtimeEvent.source
                    }`}
                  >
                    {realtimeEvent.source === 'client' ? (
                      <b>Up</b>
                    ) : (
                      <b>Down</b>
                    )}
                    <span>
                      {event.type === 'error' ? 'error!' : realtimeEvent.source}
                    </span>
                  </div>
                  <div className="event-type">
                    {event.type}
                    {count && ` (${count})`}
                  </div>
                </div>
                {!!expandedEvents[event.event_id] && (
                  <div className="event-payload">
                    {JSON.stringify(event, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
