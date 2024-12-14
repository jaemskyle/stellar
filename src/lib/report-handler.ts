// src/lib/report-handler.ts

import type { StudyInfo } from './ctgtool/ctg-tool';

/**
 * Interface for the final clinical trials report
 */
export interface TrialsReport {
  timestamp: string;
  userContext: {
    condition: string;
    purpose: string;
    demographics?: {
      age?: string;
      sex?: string;
      location?: string;
    };
    clinicalContext?: {
      diagnosisStatus?: string;
      currentTreatments?: string;
      treatmentHistory?: string;
    };
  };
  searchCriteria: {
    condition: string;
    interventions?: string[];
    status?: string[];
    sortBy?: string;
  };
  trials: StudyInfo[];
  metadata: {
    totalTrialsFound: number;
    searchTimestamp: string;
    searchParameters: Record<string, any>;
    generatedBy: 'assistant' | 'user';
    conversationComplete: boolean;
    finalNotes?: string;
  };
}

/**
 * Tool definition for report generation
 */
export const REPORT_TOOL_DEFINITION = {
  name: 'generate_report',
  description:
    'Generates a final report of clinical trials based on the conversation and latest search results.',
  parameters: {
    type: 'object',
    properties: {
      conversationComplete: {
        type: 'boolean',
        description:
          'Indicates if the conversation is complete and all necessary information has been gathered.',
      },
      finalNotes: {
        type: 'string',
        description:
          'Any final notes or observations to include in the report metadata.',
      },
    },
    required: ['conversationComplete'],
  },
};

/**
 * Class to handle report generation and management
 */
export class ReportHandler {
  private currentReport: TrialsReport | null = null;
  private latestTrials: StudyInfo[] = [];
  private latestSearchParams: Record<string, any> = {};
  private uniqueTrialsSet: Set<string> = new Set(); // Track unique NCT numbers

  /**
   * Updates the latest trials from a new CTG search and tracks unique trials
   * @param trials - New trials from latest search
   * @param searchParams - Parameters used in the search
   */
  updateLatestTrials(
    trials: StudyInfo[],
    searchParams: Record<string, any>
  ): void {
    this.latestTrials = trials;
    this.latestSearchParams = searchParams;

    // Track unique trials by NCT number
    trials.forEach(trial => {
      if (!this.uniqueTrialsSet.has(trial.nctNumber)) {
        this.uniqueTrialsSet.add(trial.nctNumber);
        console.debug('New unique trial found:', {
          nctNumber: trial.nctNumber,
          totalUnique: this.uniqueTrialsSet.size,
        });
      }
    });

    console.log('Latest trials updated:', {
      newTrialsCount: trials.length,
      totalUniqueTrials: this.uniqueTrialsSet.size,
      searchParams,
    });
  }

  /**
   * Gets the total count of unique trials encountered in the conversation
   */
  getTotalUniqueTrialsCount(): number {
    return this.uniqueTrialsSet.size;
  }

  /**
   * Generates a new report either via assistant or user trigger
   * @param memoryKv - Current memory key-value store
   * @param generatedBy - Whether report was triggered by assistant or user
   * @param conversationComplete - Whether the conversation is considered complete
   * @param finalNotes - Optional final notes for the report
   */
  generateReport(
    memoryKv: Record<string, any>,
    generatedBy: 'assistant' | 'user',
    conversationComplete: boolean = false,
    finalNotes?: string
  ): TrialsReport {
    const report: TrialsReport = {
      timestamp: new Date().toISOString(),
      userContext: {
        condition: memoryKv.condition || 'Unknown Condition',
        purpose: memoryKv.purpose || 'Unknown Purpose',
        demographics: {
          age: memoryKv.age,
          sex: memoryKv.sex,
          location: memoryKv.location,
        },
        clinicalContext: {
          diagnosisStatus: memoryKv.diagnosis_status,
          currentTreatments: memoryKv.current_treatments,
          treatmentHistory: memoryKv.treatment_history,
        },
      },
      searchCriteria: {
        condition: memoryKv.condition || 'Unknown Condition',
        interventions: memoryKv.interventions_of_interest?.split(','),
        status: this.latestSearchParams['filter.overallStatus'],
        sortBy: this.latestSearchParams.sort,
      },
      trials: this.filterAndSortTrials(this.latestTrials),
      metadata: {
        totalTrialsFound: this.uniqueTrialsSet.size, // Use total unique trials count
        searchTimestamp: new Date().toISOString(),
        searchParameters: this.latestSearchParams,
        generatedBy,
        conversationComplete,
        ...(finalNotes && { finalNotes }),
      },
    };

    this.currentReport = report;
    console.log('Report generated:', {
      timestamp: report.timestamp,
      trialsCount: report.trials.length,
      totalUniqueTrials: this.uniqueTrialsSet.size,
      generatedBy,
      conversationComplete,
      report,
    });

    return report;
  }

  /**
   * Filters and sorts trials based on relevance and user context
   */
  private filterAndSortTrials(trials: StudyInfo[]): StudyInfo[] {
    // Remove duplicates
    const uniqueTrials = trials.filter(
      (trial, index, self) =>
        index === self.findIndex(t => t.nctNumber === trial.nctNumber)
    );

    // Sort by relevance (initially just by date)
    const sortedTrials = uniqueTrials.sort((a, b) => {
      const dateA = new Date(a.startDate || '').getTime();
      const dateB = new Date(b.startDate || '').getTime();
      return dateB - dateA;
    });

    // Limit to 10 most relevant trials
    return sortedTrials.slice(0, 10);
  }

  /**
   * Gets the current report
   */
  getReport(): TrialsReport | null {
    return this.currentReport;
  }

  /**
   * Gets the latest trials
   */
  getLatestTrials(): StudyInfo[] {
    return this.latestTrials;
  }

  /**
   * Clears the current report, latest trials, and unique trials tracking
   */
  clear(): void {
    this.currentReport = null;
    this.latestTrials = [];
    this.latestSearchParams = {};
    this.uniqueTrialsSet.clear();
    console.debug('Report handler cleared, including unique trials tracking');
  }
}

// Create singleton instance
export const reportHandler = new ReportHandler();
