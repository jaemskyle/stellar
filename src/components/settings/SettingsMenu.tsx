import React from 'react';
import { Button } from '@/components/ui/button';
import { VadToggle } from './VadToggle';

interface SettingsMenuProps {
  changeTurnEndType: (value: string) => Promise<void>;
  canPushToTalk: boolean;
  fullCleanup: () => Promise<void>;
}

export function SettingsMenu({
  changeTurnEndType,
  canPushToTalk,
  fullCleanup,
}: SettingsMenuProps) {
  return (
    <div className="absolute top-16 right-4 z-20 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
      <h3 className="font-semibold mb-4">Settings</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Voice Detection Mode:</label>
          <VadToggle
            canPushToTalk={canPushToTalk}
            onChange={value => changeTurnEndType(value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fullCleanup}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Reset Everything
        </Button>
      </div>
    </div>
  );
}
