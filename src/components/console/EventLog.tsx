// src/components/console/EventLog.tsx

import React from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { EventItem } from './EventItem';
import type { EventDisplayProps } from '@/types/console';

export function EventLog({
  events,
  expandedEvents,
  onEventClick,
  formatTime,
  wavRecorder,
  wavStreamPlayer,
  eventsScrollRef,
  className = '',
}: EventDisplayProps) {
  return (
    <div className={`content-block events ${className}`}>
      <AudioVisualizer recorder={wavRecorder} player={wavStreamPlayer} />

      <div className="content-block-title">events</div>
      <div className="content-block-body" ref={eventsScrollRef}>
        {!events.length && `awaiting connection...`}
        {events.map(event => (
          <EventItem
            key={event.event.event_id}
            event={event}
            isExpanded={!!expandedEvents[event.event.event_id]}
            onEventClick={onEventClick}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  );
}
