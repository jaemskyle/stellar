import React from 'react';
import type { StudyInfo } from '../lib/ctg-tool';

// // Define the type for a single trial
// interface StudyInfo {
//   studyTitle: string;
//   nctNumber: string;
//   status: string;
//   startDate: string;
//   completionDate: string;
//   conditions: string;
//   interventions: string;
//   sponsor: string;
//   studyType: string;
//   briefSummary: string;
// }

// Define the props interface for the component
interface TrialsDisplayProps {
  trials: StudyInfo[];
  isLoading?: boolean;
}

const TrialsDisplay: React.FC<TrialsDisplayProps> = ({
  trials,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">
            Searching for clinical trials...
          </span>
        </div>
      </div>
    );
  }

  if (!trials || trials.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        No clinical trials found. Try modifying your search criteria.
      </div>
    );
  }

  return (
    <div className="w-full max-h-96 overflow-y-auto">
      {trials.map(trial => (
        <div
          key={trial.nctNumber}
          className="mb-4 p-4 border border-gray-200 rounded-lg"
        >
          <h3 className="font-bold text-lg mb-2">{trial.studyTitle}</h3>

          <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
            <div>
              <span className="font-semibold">NCT Number:</span>{' '}
              {trial.nctNumber}
            </div>
            <div>
              <span className="font-semibold">Status:</span> {trial.status}
            </div>
            <div>
              <span className="font-semibold">Start Date:</span>{' '}
              {trial.startDate}
            </div>
            <div>
              <span className="font-semibold">Completion Date:</span>{' '}
              {trial.completionDate}
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Sponsor:</span> {trial.sponsor}
            </div>
          </div>

          <div className="text-sm mb-2">
            <span className="font-semibold">Conditions:</span>
            <br />
            {trial.conditions}
          </div>

          <div className="text-sm mb-2">
            <span className="font-semibold">Interventions:</span>
            <br />
            {trial.interventions}
          </div>

          <div className="text-sm">
            <span className="font-semibold">Brief Summary:</span>
            <br />
            {trial.briefSummary}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrialsDisplay;
