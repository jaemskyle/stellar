import React from 'react';

interface LoadingStateProps {
  error: Error | null;
  isLoading: boolean;
}

export function LoadingState({ error, isLoading }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="text-red-600">
            {error?.message || 'Failed to load'}
          </div>
        )}
      </div>
    </div>
  );
}
