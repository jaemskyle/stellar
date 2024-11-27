import React from 'react';
import type { EventItemProps } from '@/types/console';

export function EventItem({
  event,
  isExpanded,
  onEventClick,
  formatTime,
}: EventItemProps) {
  const count = event.count;
  const eventData = { ...event.event };

  // Handle audio data trimming
  if (eventData.type === 'input_audio_buffer.append') {
    eventData.audio = `[trimmed: ${eventData.audio.length} bytes]`;
  } else if (eventData.type === 'response.audio.delta') {
    eventData.delta = `[trimmed: ${eventData.delta.length} bytes]`;
  }

  return (
    <div className="event">
      <div className="event-timestamp">{formatTime(event.time)}</div>
      <div className="event-details">
        <div
          className="event-summary"
          onClick={() => onEventClick(eventData.event_id)}
        >
          <div
            className={`event-source ${
              eventData.type === 'error' ? 'error' : event.source
            }`}
          >
            {event.source === 'client' ? <b>Up</b> : <b>Down</b>}
            <span>{eventData.type === 'error' ? 'error!' : event.source}</span>
          </div>
          <div className="event-type">
            {eventData.type}
            {count && ` (${count})`}
          </div>
        </div>
        {isExpanded && (
          <div className="event-payload">
            {JSON.stringify(eventData, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}
