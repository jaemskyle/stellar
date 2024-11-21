import { useState, useCallback } from 'react';
import type { RealtimeEvent } from '@/types/console';

export function useEventHandling() {
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>(
    {}
  );

  const handleEventClick = useCallback((eventId: string) => {
    setExpandedEvents(expanded => {
      const newExpanded = { ...expanded };
      if (newExpanded[eventId]) {
        delete newExpanded[eventId];
      } else {
        newExpanded[eventId] = true;
      }
      return newExpanded;
    });
  }, []);

  const addEvent = useCallback((event: Omit<RealtimeEvent, 'time'>) => {
    setRealtimeEvents(events => {
      const newEvent = {
        ...event,
        time: new Date().toISOString(),
      };

      const lastEvent = events[events.length - 1];
      if (lastEvent?.event.type === event.event.type) {
        lastEvent.count = (lastEvent.count || 0) + 1;
        return events.slice(0, -1).concat(lastEvent);
      }

      return [...events, newEvent];
    });
  }, []);

  const clearEvents = useCallback(() => {
    setRealtimeEvents([]);
    setExpandedEvents({});
  }, []);

  return {
    realtimeEvents,
    expandedEvents,
    handleEventClick,
    addEvent,
    clearEvents,
    setRealtimeEvents,
  };
}
