// src/components/ReportModal.tsx

import React from 'react';
import type { TrialsReport } from '../lib/report-handler';
// If @ alias isn't set up, use relative path:
// import type { TrialsReport } from '../lib/report-handler';

interface ReportModalProps {
  report: TrialsReport | null;
  onClose: () => void;
  isOpen: boolean;
}

const ReportModal: React.FC<ReportModalProps> = ({
  report,
  onClose,
  isOpen,
}) => {
  if (!report || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Clinical Trials Report
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <span className="sr-only">Close</span>×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* User Context Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              User Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Condition</p>
                <p className="text-base text-gray-900">
                  {report.userContext.condition}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Purpose</p>
                <p className="text-base text-gray-900">
                  {report.userContext.purpose}
                </p>
              </div>
              {report.userContext.demographics && (
                <>
                  {report.userContext.demographics.age && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Age</p>
                      <p className="text-base text-gray-900">
                        {report.userContext.demographics.age}
                      </p>
                    </div>
                  )}
                  {report.userContext.demographics.sex && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Sex</p>
                      <p className="text-base text-gray-900">
                        {report.userContext.demographics.sex}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Clinical Context Section */}
          {report.userContext.clinicalContext && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Clinical Context
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {report.userContext.clinicalContext.diagnosisStatus && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Diagnosis Status
                    </p>
                    <p className="text-base text-gray-900">
                      {report.userContext.clinicalContext.diagnosisStatus}
                    </p>
                  </div>
                )}
                {report.userContext.clinicalContext.currentTreatments && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Current Treatments
                    </p>
                    <p className="text-base text-gray-900">
                      {report.userContext.clinicalContext.currentTreatments}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trials Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Relevant Clinical Trials ({report.trials.length})
            </h3>
            <div className="space-y-4">
              {report.trials.map(trial => (
                <div
                  key={trial.nctNumber}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <h4 className="text-base font-medium text-gray-900 mb-2">
                    {trial.studyTitle}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                    <div>
                      <span className="font-medium text-gray-500">
                        NCT Number:
                      </span>{' '}
                      <span className="text-gray-900">{trial.nctNumber}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Status:</span>{' '}
                      <span className="text-gray-900">{trial.status}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">
                        Start Date:
                      </span>{' '}
                      <span className="text-gray-900">{trial.startDate}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">
                        Completion Date:
                      </span>{' '}
                      <span className="text-gray-900">
                        {trial.completionDate}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="font-medium text-gray-500">
                      Brief Summary:
                    </span>
                    <p className="text-gray-900 mt-1">{trial.briefSummary}</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-500">
                      Eligibility:
                    </span>
                    <div className="mt-1 space-y-1">
                      <p>
                        <span className="font-medium">Minimum Age:</span>{' '}
                        {trial.eligibilityModule.minimumAge}
                      </p>
                      <p>
                        <span className="font-medium">Sex:</span>{' '}
                        {trial.eligibilityModule.sex}
                      </p>
                      <p>
                        <span className="font-medium">
                          Accepts Healthy Volunteers:
                        </span>{' '}
                        {trial.eligibilityModule.healthyVolunteers
                          ? 'Yes'
                          : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500">
              Report generated at {new Date(report.timestamp).toLocaleString()}{' '}
              by {report.metadata.generatedBy}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
            <button
              onClick={() => window.print()} // We can enhance this later
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
