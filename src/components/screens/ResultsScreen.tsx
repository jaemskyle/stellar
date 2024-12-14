// src/components/ResultsScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  ExternalLink,
  Filter,
  Mic,
  ChevronDown,
  Info,
} from 'lucide-react';
import type { StudyInfo } from '@/lib/ctgtool/ctg-tool';
import type { TrialsReport } from '@/lib/report-handler';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define interfaces
interface ResultsScreenProps {
  finalReport: TrialsReport | null;
  isLoadingTrials: boolean;
  onStartNewSearch: () => Promise<void>;
}

// Subcomponents (internal)
interface TrialCardProps {
  trial: StudyInfo;
  isExpanded: boolean;
  onToggle: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyles = useCallback((status: string) => {
    switch (status) {
      case 'RECRUITING':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE_NOT_RECRUITING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyles(status)}`}
    >
      {status}
    </span>
  );
};

const TrialCard: React.FC<TrialCardProps> = ({
  trial,
  isExpanded,
  onToggle,
}) => {
  useEffect(() => {
    console.debug('TrialCard rendered:', {
      nctNumber: trial.nctNumber,
      isExpanded,
    });
  }, [trial.nctNumber, isExpanded]);

  return (
    <motion.div
      layout
      className="border rounded-lg overflow-hidden bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Set up flex column layout */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col justify-between h-full"
        onClick={onToggle}
      >
        {/* Top content */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-grow">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              <a
                href={`https://clinicaltrials.gov/study/${trial.nctNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:text-blue-800"
              >
                {trial.studyTitle}
                {/* <ExternalLink className="inline-block w-4 h-4 ml-1 align-text-top text-blue-600" /> */}
              </a>
            </h4>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{trial.nctNumber}</span>
              <span>•</span>
              <span>{trial.sponsor}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={trial.status} />
            <motion.button
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.button>
          </div>
          {/* Actions */}
          {/* <div className="flex justify-end pt-2">
            <a
              href={`https://clinicaltrials.gov/study/${trial.nctNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              View on ClinicalTrials.gov
              <ExternalLink className="w-4 h-4" />
            </a>
          </div> */}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="border-t"
          >
            <div className="p-4 space-y-4">
              {/* Summary Section */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">
                  Study Summary
                </h5>
                <p className="text-gray-700 text-sm">{trial.briefSummary}</p>
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Start Date:</span>{' '}
                  <span className="text-gray-700">
                    {new Date(trial.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    Completion Date:
                  </span>{' '}
                  <span className="text-gray-700">
                    {new Date(trial.completionDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Study Type:</span>{' '}
                  <span className="text-gray-700">{trial.studyType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Conditions:</span>{' '}
                  <span className="text-gray-700">{trial.conditions}</span>
                </div>
              </div>

              {/* Eligibility Section */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">
                  Eligibility Criteria
                </h5>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">
                      Age Range:
                    </span>{' '}
                    <span className="text-gray-700">
                      {trial.eligibilityModule.minimumAge} -{' '}
                      {trial.eligibilityModule.maximumAge}
                    </span>
                  </div>
                  {/* {trial.eligibilityModule.minimumAge}—{trial.eligibilityModule.maximumAge} */}
                  <div>
                    <span className="font-medium text-gray-900">Sex:</span>{' '}
                    <span className="text-gray-700">
                      {trial.eligibilityModule.sex}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Healthy Volunteers:
                    </span>{' '}
                    <span className="text-gray-700">
                      {trial.eligibilityModule.healthyVolunteers ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  {trial.eligibilityModule.eligibilityCriteria}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const UserContext: React.FC<{ report: TrialsReport }> = ({ report }) => (
  <Card>
    <CardHeader>
      <CardTitle>Your Information</CardTitle>
      <CardDescription>
        Profile used for finding relevant trials
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900">Condition</h4>
          <p className="text-gray-700">{report.userContext.condition}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Purpose</h4>
          <p className="text-gray-700">{report.userContext.purpose}</p>
        </div>
        {report.userContext.demographics && (
          <>
            {report.userContext.demographics.age && (
              <div>
                <h4 className="font-medium text-gray-900">Age</h4>
                <p className="text-gray-700">
                  {report.userContext.demographics.age}
                </p>
              </div>
            )}
            {report.userContext.demographics.sex && (
              <div>
                <h4 className="font-medium text-gray-900">Sex</h4>
                <p className="text-gray-700">
                  {report.userContext.demographics.sex}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </CardContent>
  </Card>
);

// Main ResultsScreen component
const ResultsScreen: React.FC<ResultsScreenProps> = ({
  finalReport,
  isLoadingTrials,
  onStartNewSearch,
}) => {
  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('trials');

  // Refs for debugging/logging
  const renderCountRef = useRef(0);
  const componentMountTimeRef = useRef(new Date());

  // Effects and Logging
  useEffect(() => {
    renderCountRef.current += 1;
    console.debug('ResultsScreen rendered:', {
      renderCount: renderCountRef.current,
      mountedAt: componentMountTimeRef.current,
      trialsCount: finalReport?.trials.length ?? 0,
      isLoading: isLoadingTrials,
      activeTab,
    });
  });

  // Memoized handlers
  const handleExport = useCallback(() => {
    try {
      if (!finalReport) {
        console.warn('Export attempted with no report available');
        return;
      }

      console.debug('Exporting report:', {
        timestamp: finalReport.timestamp,
        trialsCount: finalReport.trials.length,
      });

      const exportData = {
        ...finalReport,
        exportDate: new Date().toISOString(),
        metadata: {
          ...finalReport.metadata,
          exportedAt: new Date().toISOString(),
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const fileName = `clinical-trials-report-${finalReport.timestamp.split('T')[0]}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.debug('Report exported successfully:', { fileName });
    } catch (error) {
      console.error('Error exporting report:', error);
      // Could add error handling UI here
    }
  }, [finalReport]);

  // Handlers
  const toggleTrialExpansion = useCallback((nctNumber: string) => {
    setExpandedTrials(prev => {
      const next = new Set(prev);
      if (next.has(nctNumber)) {
        next.delete(nctNumber);
      } else {
        next.add(nctNumber);
      }
      return next;
    });
  }, []);

  // Computed values
  // Filter trials based on search and status
  const trials = finalReport?.trials ?? [];
  const filteredTrials = trials.filter(trial => {
    const matchesSearch =
      searchTerm === '' ||
      trial.studyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.briefSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trial.nctNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || trial.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(
    new Set(trials.map(trial => trial.status))
  ).sort();

  // Render loading state
  if (isLoadingTrials) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <h2 className="text-2xl font-semibold mb-4">
            Finding Clinical Trials
          </h2>
          <p className="text-gray-600">
            Please wait while we process your results...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (!finalReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Results</AlertTitle>
          <AlertDescription>
            Unable to display results. Please try starting a new search.
          </AlertDescription>
        </Alert>
        <Button onClick={onStartNewSearch} className="mt-4">
          Start Another Search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow overflow-auto items-center max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        {/* <h1 className="text-4xl font-bold mb-4">Clinical Trial Results</h1> */}
        <h1 className="text-4xl font-bold text-center mb-4">
          Consult with your healthcare professional
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          We found <em>{finalReport.metadata.totalTrialsFound}</em> trials. Here
          are the top {trials.length} closest matches.
          {/* trials matching your criteria */}
        </p>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Important Note</AlertTitle>
          <AlertDescription>
            Please consult with your healthcare provider about these trials.
            They can help determine which trials might be most appropriate for
            your situation.
          </AlertDescription>
        </Alert>

        <Button
          onClick={onStartNewSearch}
          className="bg-black hover:bg-gray-800 text-white"
        >
          <Mic className="w-4 h-4 mr-2" />
          Start Another Search
        </Button>
      </div>

      {/* Main Content */}
      <div className="w-full space-y-6 flex flex-col flex-grow overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trials">Results</TabsTrigger>
            <TabsTrigger value="profile">Your Information</TabsTrigger>
          </TabsList>

          <TabsContent
            value="trials"
            className="space-y-6 flex flex-col flex-grow overflow-auto"
          >
            {/* Search and Filter Bar */}
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

            {/* Trials List */}
            {/* <ScrollArea className="h-[600px]"> */}
            <ScrollArea className="border-2 border-spacing-1 rounded-lg h-[1000px]">
              <div className="space-y-4">
                {filteredTrials.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No trials match your search criteria.
                    </p>
                  </div>
                ) : (
                  filteredTrials.map(trial => (
                    <TrialCard
                      key={trial.nctNumber}
                      trial={trial}
                      isExpanded={expandedTrials.has(trial.nctNumber)}
                      onToggle={() => toggleTrialExpansion(trial.nctNumber)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Export Report Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleExport}
                className="inline-flex items-center gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Export Results
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            {finalReport && <UserContext report={finalReport} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ResultsScreen;
