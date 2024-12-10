import React from 'react';

interface AudioPlayerProps {
  /**
   * The audio file to play
   */
  file: {
    /**
     * URL of the audio file
     */
    url: string;
  };
}

/**
 * AudioPlayer provides a simple wrapper around the HTML5 audio element
 * with consistent styling and a maximum width.
 *
 * @example
 * ```tsx
 * <AudioPlayer file={{ url: 'path/to/audio.wav' }} />
 * ```
 */
export function AudioPlayer({ file }: AudioPlayerProps) {
  return (
    <div className="mt-2">
      <audio
        src={file.url}
        controls
        className="w-full max-w-xs"
        // Add accessibility attributes
        aria-label="Audio playback control"
      />
    </div>
  );
}
