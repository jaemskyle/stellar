// src/components/ReportModal.tsx

import React, { useState, useCallback } from 'react';
import type { TrialsReport } from '@/lib/report-handler';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, X, ExternalLink, Filter } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filter trials based on search and status
  const filteredTrials = report?.trials.filter(trial => {
    const matchesSearch =
      searchTerm === '' ||
      trial.studyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.briefSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.nctNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || trial.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filter dropdown
  const uniqueStatuses =
    report?.trials
      .map(trial => trial.status)
      .filter((value, index, self) => self.indexOf(value) === index) || [];

  // Export report as JSON
  const handleExport = useCallback(() => {
    if (!report) return;

    const exportData = {
      ...report,
      exportDate: new Date().toISOString(),
      filteredResults: filteredTrials,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-trials-report-${report.timestamp.split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report, filteredTrials]);

  if (!report || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-wrapper">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center"
            onClick={e => e.target === e.currentTarget && onClose()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto z-[101]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-20 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800">
                  Clinical Trials Report
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-gray-500" />
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
                      <p className="text-sm font-medium text-gray-500">
                        Condition
                      </p>
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
                            <p className="text-sm font-medium text-gray-500">
                              Age
                            </p>
                            <p className="text-base text-gray-900">
                              {report.userContext.demographics.age}
                            </p>
                          </div>
                        )}
                        {report.userContext.demographics.sex && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Sex
                            </p>
                            <p className="text-base text-gray-900">
                              {report.userContext.demographics.sex}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="sticky top-[73px] z-10 bg-white pt-2 pb-4 border-b">
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search trials..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        value={selectedStatus}
                        onChange={e => setSelectedStatus(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
                      >
                        <option value="all">All Statuses</option>
                        {uniqueStatuses.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Trials Section */}
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Relevant Clinical Trials ({filteredTrials?.length || 0})
                  </h3>
                  <div className="space-y-4">
                    {filteredTrials?.map(trial => (
                      <motion.div
                        key={trial.nctNumber}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-base font-medium text-gray-900 mb-2 flex-1">
                            <a
                              href={`https://clinicaltrials.gov/study/${trial.nctNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 inline-flex items-center gap-1"
                            >
                              {trial.studyTitle}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              trial.status === 'RECRUITING'
                                ? 'bg-green-100 text-green-800'
                                : trial.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : trial.status === 'ACTIVE_NOT_RECRUITING'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {trial.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                          <div>
                            <span className="font-medium text-gray-500">
                              NCT Number:
                            </span>{' '}
                            <span className="text-gray-900">
                              {trial.nctNumber}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">
                              Sponsor:
                            </span>{' '}
                            <span className="text-gray-900">{trial.sponsor}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">
                              Start Date:
                            </span>{' '}
                            <span className="text-gray-900">
                              {trial.startDate}
                            </span>
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
                          <p className="text-gray-900 mt-1">
                            {trial.briefSummary}
                          </p>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium text-gray-500">
                            Key Eligibility:
                          </span>
                          <div className="mt-1 grid grid-cols-3 gap-4">
                            <div>
                              <span className="font-medium">Minimum Age:</span>{' '}
                              {trial.eligibilityModule.minimumAge}
                            </div>
                            <div>
                              <span className="font-medium">Sex:</span>{' '}
                              {trial.eligibilityModule.sex}
                            </div>
                            <div>
                              <span className="font-medium">
                                Healthy Volunteers:
                              </span>{' '}
                              {trial.eligibilityModule.healthyVolunteers
                                ? 'Yes'
                                : 'No'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* No Results Message */}
                {filteredTrials?.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No trials match your search criteria.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t z-20">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Report generated at{' '}
                    {new Date(report.timestamp).toLocaleString()} by{' '}
                    {report.metadata.generatedBy}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleExport}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
