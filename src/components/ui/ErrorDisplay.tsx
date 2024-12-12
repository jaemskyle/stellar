import React from 'react';

interface ErrorDisplayProps {
  error: Error | null;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
      {error?.message}
    </div>
  );
}
