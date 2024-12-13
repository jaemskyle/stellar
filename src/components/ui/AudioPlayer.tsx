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
    <div className="mt-3 -mb-2">
      {' '}
      {/* Removed ml-8 */}
      <div className="group relative transform transition-all duration-300 hover:scale-[1.02]">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
        <div className="relative bg-white/10 dark:bg-black/10 backdrop-blur-md rounded-xl p-1.5">
          {' '}
          {/* Reduced padding from p-2 */}
          <audio
            src={file.url}
            controls
            className="w-full h-6 min-w-[280px] max-w-md rounded-lg opacity-75 hover:opacity-100 transition-opacity duration-200"
            // Height reduced from h-7 to h-6
            // Min-width increased from 250px to 280px
            // Max-width changed from max-w-sm to max-w-md for slightly wider player
            style={{
              backgroundColor: 'transparent',
              ...({
                '--webkit-media-controls-panel-height': '24px',
                '--webkit-media-controls-timeline-height': '2px',
                '--webkit-media-controls-current-time-display':
                  'color-scheme: dark',
                '--webkit-media-controls-time-remaining-display':
                  'color-scheme: dark',
                '--webkit-media-controls-volume-slider':
                  'accent-color: currentColor',
                '--webkit-media-controls-timeline':
                  'accent-color: currentColor',
              } as unknown as React.CSSProperties),
            }}
            aria-label="Audio playback control"
          />
        </div>
      </div>
    </div>
  );
}
