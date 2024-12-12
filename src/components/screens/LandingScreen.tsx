import React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingScreenProps {
  /**
   * Callback function to be called when the user starts the conversation
   * Returns a Promise that resolves when the connection is established
   */
  onStart: () => Promise<void>;
}

/**
 * LandingScreen is the initial screen shown to users.
 * It displays a welcome message and a microphone button to start the conversation.
 *
 * @example
 * ```tsx
 * <LandingScreen onStart={async () => {
 *   await connectToConversation();
 *   setScreen('chat');
 * }} />
 * ```
 */
export function LandingScreen({ onStart }: LandingScreenProps) {
  return (
    <div className="flex flex-col flex-grow overflow-auto items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-bold leading-tight mb-6">
        Find the Right Clinical Trial.
        <br />
        Anywhere, Anytime.
      </h1>

      <p className="text-lg text-gray-600 mb-16 max-w-2xl">
        Search for trials in your language, tailored to your knowledge level.
        <br />
        Simplifying access for patients and caregivers worldwide.
      </p>

      <div className="flex flex-col items-center">
        <p className="text-sm mb-4">Tap to start</p>
        <button
          className="w-20 h-20 rounded-full bg-black hover:bg-gray-800 transition-colors flex items-center justify-center"
          onClick={() => {
            onStart();
          }}
          aria-label="Start conversation"
        >
          <Mic className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
}
