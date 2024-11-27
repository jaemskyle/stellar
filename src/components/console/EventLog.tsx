// src/components/console/EventLog.tsx

import React, { useEffect } from 'react';
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
  useEffect(() => {
    const scrollRef = eventsScrollRef?.current;
    if (!scrollRef) return;

    scrollRef.scrollTo({
      top: scrollRef.scrollHeight,
      behavior: 'smooth',
    });
  }, [events, eventsScrollRef]);

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
