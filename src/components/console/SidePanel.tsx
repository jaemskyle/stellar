import React from 'react';
import type { StudyInfo } from '@/lib/ctg-tool';
import type { MemoryKV } from '@/types/console';
import TrialsDisplay from '@/components/TrialsDisplay';

interface SidePanelProps {
  memoryKv: MemoryKV;
  trials: StudyInfo[];
  isLoadingTrials: boolean;
}

export function SidePanel({
  memoryKv,
  trials,
  isLoadingTrials,
}: SidePanelProps) {
  return (
    <>
      <div className="content-block kv">
        <div className="content-block-title">User Information</div>
        <div className="content-block-body content-kv">
          {JSON.stringify(memoryKv, null, 2)}
        </div>
      </div>
      <div className="content-block trials">
        <div className="content-block-title">Clinical Trials</div>
        <div className="content-block-body">
          <TrialsDisplay trials={trials} isLoading={isLoadingTrials} />
        </div>
      </div>
    </>
  );
}
