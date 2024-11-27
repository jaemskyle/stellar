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
import type { StudyInfo } from '@/lib/ctg-tool';
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
  trials: StudyInfo[];
  isLoadingTrials: boolean;
  memoryKv: Record<string, any>;
  finalReport: TrialsReport | null;
  onStartNewSearch: () => Promise<void>;
  onExportReport: () => void;
}

interface TrialCardProps {
  trial: StudyInfo;
  isExpanded: boolean;
  onToggle: () => void;
}

// Sub-components
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyles = (status: string) => {
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
  };

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
  // Logging for debugging
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
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-grow">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {trial.studyTitle}
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
        </div>
      </div>

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
                      Minimum Age:
                    </span>{' '}
                    <span className="text-gray-700">
                      {trial.eligibilityModule.minimumAge}
                    </span>
                  </div>
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

              {/* Actions */}
              <div className="flex justify-end pt-2">
                <a
                  href={`https://clinicaltrials.gov/study/${trial.nctNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  View on ClinicalTrials.gov
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const UserContext: React.FC<{ report: TrialsReport }> = ({ report }) => {
  return (
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
};

// Main ResultsScreen component
const ResultsScreen: React.FC<ResultsScreenProps> = ({
  trials,
  isLoadingTrials,
  memoryKv,
  finalReport,
  onStartNewSearch,
  onExportReport,
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('trials');

  // Refs for logging
  const renderCountRef = useRef(0);

  // Logging
  useEffect(() => {
    renderCountRef.current += 1;
    console.debug('ResultsScreen rendered:', {
      renderCount: renderCountRef.current,
      trialsCount: trials.length,
      isLoading: isLoadingTrials,
      activeTab,
    });
  });

  // Filter trials based on search and status
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Clinical Trial Results</h1>
        <p className="text-xl text-gray-600 mb-6">
          Found {trials.length} trials matching your criteria
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
          Start New Search
        </Button>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trials">Clinical Trials</TabsTrigger>
            <TabsTrigger value="profile">Your Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="trials" className="space-y-6">
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
            <ScrollArea className="h-[600px]">
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
                onClick={onExportReport}
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
