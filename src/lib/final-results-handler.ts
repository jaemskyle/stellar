// src/lib/final-results-handler.ts

import type { StudyInfo } from './ctg-tool';

/**
 * Interface for storing the final report state
 */
export interface FinalReport {
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
  };
}

/**
 * Class to handle final trial results and report generation
 */
export class FinalResultsHandler {
  private currentReport: FinalReport | null = null;

  /**
   * Creates a new final report instance
   */
  initializeReport(condition: string, purpose: string): void {
    this.currentReport = {
      timestamp: new Date().toISOString(),
      userContext: {
        condition,
        purpose,
        demographics: {},
        clinicalContext: {},
      },
      searchCriteria: {
        condition,
      },
      trials: [],
      metadata: {
        totalTrialsFound: 0,
        searchTimestamp: new Date().toISOString(),
        searchParameters: {},
      },
    };
  }

  /**
   * Updates user context in the report
   */
  updateUserContext(context: Partial<FinalReport['userContext']>): void {
    if (!this.currentReport) {
      throw new Error('Report not initialized');
    }
    this.currentReport.userContext = {
      ...this.currentReport.userContext,
      ...context,
    };
  }

  /**
   * Sets the final trials for the report
   */
  setFinalTrials(trials: StudyInfo[], searchParams: Record<string, any>): void {
    if (!this.currentReport) {
      throw new Error('Report not initialized');
    }

    // Filter out duplicates by NCT number
    const uniqueTrials = trials.filter(
      (trial, index, self) =>
        index === self.findIndex(t => t.nctNumber === trial.nctNumber)
    );

    this.currentReport.trials = uniqueTrials;
    this.currentReport.metadata = {
      totalTrialsFound: uniqueTrials.length,
      searchTimestamp: new Date().toISOString(),
      searchParameters: searchParams,
    };

    // Log the captured final results for testing
    console.log('Final Report Generated:', {
      timestamp: this.currentReport.timestamp,
      totalTrials: this.currentReport.metadata.totalTrialsFound,
      searchParams: this.currentReport.metadata.searchParameters,
    });
    console.log('Final Trials:', this.currentReport.trials);
  }

  /**
   * Gets the current report
   */
  getReport(): FinalReport | null {
    return this.currentReport;
  }

  /**
   * Clears the current report
   */
  clearReport(): void {
    this.currentReport = null;
  }

  /**
   * Validates if trials are relevant based on user context
   */
  private validateTrialRelevance(trial: StudyInfo): boolean {
    if (!this.currentReport?.userContext) return true;

    const context = this.currentReport.userContext;
    const eligibility = trial.eligibilityModule;

    // Basic demographic validation
    if (context.demographics) {
      const { age, sex } = context.demographics;

      if (age && eligibility.minimumAge) {
        const userAge = parseInt(age);
        const minAge = parseInt(eligibility.minimumAge);
        if (isNaN(userAge) || isNaN(minAge) || userAge < minAge) {
          return false;
        }
      }

      if (
        sex &&
        eligibility.sex &&
        eligibility.sex !== 'All' &&
        eligibility.sex !== sex
      ) {
        return false;
      }
    }

    return true;
  }
}

// Instance for global usage
export const finalResultsHandler = new FinalResultsHandler();
