// src/lib/ctg-tool.ts

import { CTG_TOOL_DEFINITION } from './ctg-tool-def';

/**
 * Represents the summarized information of a clinical study.
 */
export interface StudyInfo {
  studyTitle: string; // Official title of the study.
  nctNumber: string; // NCT number (ClinicalTrials.gov identifier).
  status: string; // Overall recruitment status of the study.
  startDate: string; // Start date of the study.
  completionDate: string; // Estimated or actual completion date of the study.
  conditions: string; // Conditions or diseases being studied.
  interventions: string; // Interventions or treatments being tested.
  studyType: string; // Type of the study (e.g., Interventional, Observational).
  briefSummary: string; // Brief summary of the study.
  sponsor: string; // Lead sponsor of the study.
  eligibilityModule: EligibilityModule; // Detailed eligibility criteria and demographics.
}
/**
 * Represents the eligibility criteria of a clinical study.
 */
export interface EligibilityModule {
  /** Detailed description of the eligibility criteria. */
  eligibilityCriteria: string;
  /** Indicates if healthy volunteers are accepted. */
  healthyVolunteers: boolean;
  /** The gender eligible for the study. */
  sex: string;
  /** The minimum age eligible for the study. */
  minimumAge: string;
  /** Standardized age categories for the study. */
  stdAges: string[];
}

/**
 * Represents the protocol sections of a clinical trial.
 */
interface ProtocolSection {
  /** Identification module containing title and NCT ID. */
  identificationModule?: {
    officialTitle?: string;
    nctId?: string;
  };
  /** Status module containing overall status and dates. */
  statusModule?: {
    overallStatus?: string;
    startDateStruct?: { date: string };
    completionDateStruct?: { date: string };
  };
  /** Sponsor and collaborators module. */
  sponsorCollaboratorsModule?: {
    leadSponsor?: { name: string };
  };
  /** Conditions module listing the study conditions. */
  conditionsModule?: {
    conditions?: string[];
  };
  /** Interventions module listing the study interventions. */
  armsInterventionsModule?: {
    interventions?: { name: string }[];
  };
  /** Design module detailing the study type. */
  designModule?: {
    studyType?: string;
  };
  /** Description module containing the brief summary. */
  descriptionModule?: {
    briefSummary?: string;
  };
  /** Eligibility module with eligibility criteria and demographics. */
  eligibilityModule?: {
    eligibilityCriteria?: string;
    healthyVolunteers?: boolean;
    gender?: string;
    minimumAge?: string;
    stdAges?: string[];
  };
}

/**
 * Definition of the CTG_TOOL, which retrieves clinical trials from ClinicalTrials.gov
 * based on search criteria.
 */
export const CTG_TOOL_SHORT_DEFINITION = {
  name: 'get_trials',
  description:
    'Retrieves clinical trials from ClinicalTrials.gov based on search criteria.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Medical condition or disease to search for',
          },
          intervention: {
            type: 'string',
            description: 'Treatment, drug, or intervention to search for',
          },
          outcome: {
            type: 'string',
            description: 'Outcome or endpoint to search for',
          },
          term: {
            type: 'string',
            description: 'General search term',
          },
        },
      },
      filter: {
        type: 'object',
        properties: {
          overallStatus: {
            type: 'string',
            description: 'Trial status (e.g., "RECRUITING,COMPLETED")',
          },
          phase: {
            type: 'string',
            description: 'Trial phase (e.g., "Phase3")',
          },
        },
      },
      pageSize: {
        type: 'number',
        description: 'Number of results to return',
      },
      sort: {
        type: 'string',
        description: 'Sort order (e.g., "LastUpdatePostDate:desc")',
      },
    },
    required: ['pageSize'],
  },
};

/**
 * Fetches clinical trials from ClinicalTrials.gov based on the provided parameters.
 *
 * Constructs a query string from the provided parameters, sends a request to the
 * ClinicalTrials.gov API, and processes the response to return an array of `StudyInfo` objects.
 *
 * @param params - The parameters for fetching clinical trials.
 * @returns A promise that resolves to an array of `StudyInfo` objects.
 * @throws Will throw an error if the API request fails or the response cannot be processed.
 */
interface ClinicalTrialParams {
  format?: 'csv' | 'json';
  markupFormat?: 'markdown' | 'legacy';
  'query.cond'?: string;
  'query.term'?: string;
  'query.locn'?: string;
  'query.titles'?: string;
  'query.intr'?: string;
  'query.outc'?: string;
  'query.spons'?: string;
  'query.lead'?: string;
  'query.id'?: string;
  'query.patient'?: string;
  'filter.overallStatus'?: string[];
  'filter.geo'?: string;
  'filter.ids'?: string[];
  'filter.advanced'?: string;
  'filter.synonyms'?: string[];
  'postFilter.overallStatus'?: string[];
  'postFilter.geo'?: string;
  'postFilter.ids'?: string[];
  'postFilter.advanced'?: string;
  'postFilter.synonyms'?: string[];
  aggFilters?: string;
  geoDecay?: string;
  fields?: string[];
  sort?: string[];
  countTotal?: boolean;
  pageSize: number;
  pageToken?: string;
}

export async function getClinicalTrials(
  params: ClinicalTrialParams
): Promise<StudyInfo[]> {
  const queryParams = new URLSearchParams();

  // Build the query parameters from the provided params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Convert array values to comma-separated strings
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  }

  // Construct the full API URL
  const apiUrl = `https://clinicaltrials.gov/api/v2/studies?${queryParams.toString()}`;

  try {
    // Log the API request URL for debugging purposes
    console.debug(`Sending request to ClinicalTrials.gov API: ${apiUrl}`);

    // Make the API request to ClinicalTrials.gov
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    // Check if the response is successful
    if (!response.ok) {
      // Log the error response
      console.error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
      throw new Error(`API request failed: ${response.statusText}`);
    }

    // Parse the response data
    const data = await response.json();

    // Check if the response contains studies
    if (!data.studies || !Array.isArray(data.studies)) {
      console.warn('No studies found in the API response.');
      return [];
    }

    // Log the number of studies retrieved
    console.info(
      `Retrieved ${data.studies.length} studies from ClinicalTrials.gov`
    );

    // Map the response to our StudyInfo interface
    return data.studies.map((study: { protocolSection: ProtocolSection }) => {
      // Extract the relevant modules from the protocol section
      const protocol = study.protocolSection;
      const identification = protocol?.identificationModule || {};
      const status = protocol?.statusModule || {};
      const sponsor = protocol?.sponsorCollaboratorsModule || {};
      const conditions = protocol?.conditionsModule || {};
      const interventions = protocol?.armsInterventionsModule || {};
      const design = protocol?.designModule || {};
      const description = protocol?.descriptionModule || {};
      const eligibility = protocol?.eligibilityModule || {};

      // Log the NCT number of the current study
      console.debug(
        `Processing study NCT Number: ${identification.nctId || 'Unknown'}`
      );

      // Return the mapped StudyInfo object
      return {
        studyTitle: identification.officialTitle || '',
        nctNumber: identification.nctId || '',
        status: status.overallStatus || '',
        startDate: status.startDateStruct?.date || '',
        completionDate: status.completionDateStruct?.date || '',
        conditions: conditions.conditions?.join(', ') || '',
        interventions:
          interventions.interventions?.map((i: any) => i.name).join(', ') || '',
        sponsor: sponsor.leadSponsor?.name || '',
        studyType: design.studyType || '',
        briefSummary: description.briefSummary || '',
        eligibilityModule: {
          eligibilityCriteria: eligibility.eligibilityCriteria || '',
          healthyVolunteers: eligibility.healthyVolunteers || false,
          sex: eligibility.gender || '',
          minimumAge: eligibility.minimumAge || '',
          stdAges: eligibility.stdAges || [],
        },
      };
    });
  } catch (error) {
    // Log any errors encountered during the fetch or processing
    console.error('An error occurred while fetching clinical trials:', error);
    throw error; // Re-throw the error after logging it
  }
}

// Export the new tool definition
export { CTG_TOOL_DEFINITION };
