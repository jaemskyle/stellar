// src/utils/timeUtils.ts

/**
 * Formats a timestamp relative to a start time in MM:SS.HH format
 * @param timestamp ISO string timestamp to format
 * @param startTime ISO string timestamp to use as reference point
 * @returns Formatted time string
 */
export const formatTime = (timestamp: string, startTime: string): string => {
  const t0 = new Date(startTime).valueOf();
  const t1 = new Date(timestamp).valueOf();
  const delta = t1 - t0;
  const hs = Math.floor(delta / 10) % 100;
  const s = Math.floor(delta / 1000) % 60;
  const m = Math.floor(delta / 60_000) % 60;
  const pad = (n: number) => {
    let s = n + '';
    while (s.length < 2) {
      s = '0' + s;
    }
    return s;
  };
  return `${pad(m)}:${pad(s)}.${pad(hs)}`;
};

/**
 * Calculates duration between two timestamps in milliseconds
 */
export const calculateDuration = (start: string, end: string): number => {
  return new Date(end).valueOf() - new Date(start).valueOf();
};
