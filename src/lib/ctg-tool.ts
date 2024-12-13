// src/lib/ctg-tool.ts --- UPDATED

import { CTG_TOOL_DEFINITION } from './ctg-tool-def';

/**
 * Represents the paginated response from the ClinicalTrials.gov API
 */
export interface PagedStudyResponse {
  /** Total number of studies matching the query (only present if countTotal=true) */
  totalCount?: number;
  /** Array of study objects containing requested fields */
  studies: StudyInfo[];
  /** Token for retrieving the next page of results, if available */
  nextPageToken?: string;
}

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
  /** Detailed description of the eligibility criteria */
  eligibilityCriteria: string;
  /** Indicates if healthy volunteers are accepted */
  healthyVolunteers: boolean;
  /** The gender eligible for the study (FEMALE, MALE, or ALL) */
  sex: string;
  /** Indicates if the study is gender-specific */
  genderBased: boolean;
  /** Additional details about gender-specific aspects of the study */
  genderDescription: string;
  /** The minimum age eligible for the study (format: "X Years", "X Months", etc.) */
  minimumAge: string;
  /** The maximum age eligible for the study (format: "X Years", "X Months", etc.) */
  maximumAge: string;
  /** Standardized age categories for the study (CHILD, ADULT, OLDER_ADULT) */
  stdAges: string[];
  /** Description of the target study population */
  studyPopulation: string;
  /** Method used for sampling (PROBABILITY_SAMPLE or NON_PROBABILITY_SAMPLE) */
  samplingMethod: string;
}

/**
 * Represents the protocol sections of a clinical trial.
 */
interface ProtocolSection {
  /** Identification module containing title and NCT ID */
  identificationModule?: {
    officialTitle?: string;
    nctId?: string;
  };
  /** Status module containing overall status and dates */
  statusModule?: {
    overallStatus?: string;
    startDateStruct?: { date: string };
    completionDateStruct?: { date: string };
  };
  /** Sponsor and collaborators module */
  sponsorCollaboratorsModule?: {
    leadSponsor?: { name: string };
  };
  /** Conditions module listing the study conditions */
  conditionsModule?: {
    conditions?: string[];
  };
  /** Interventions module listing the study interventions */
  armsInterventionsModule?: {
    interventions?: { name: string }[];
  };
  /** Design module detailing the study type */
  designModule?: {
    studyType?: string;
  };
  /** Description module containing the brief summary */
  descriptionModule?: {
    briefSummary?: string;
  };
  /** Eligibility module with eligibility criteria and demographics */
  eligibilityModule?: EligibilityModule;
}

/**
 * Parameters for fetching clinical trials from ClinicalTrials.gov API
 */
export interface ClinicalTrialParams {
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
  aggFilters?: string;
  geoDecay?: string;
  fields?: string[];
  sort?: string[];
  countTotal?: boolean;
  pageSize: number;
  pageToken?: string;
}

// /**
//  * Represents an intervention or treatment being tested in the study
//  */
// interface APIIntervention {
//   /** The type of intervention (e.g., DRUG, BEHAVIORAL, DEVICE, etc.) */
//   type: InterventionType;
//   /** Name of the intervention */
//   name: string;
//   /** Detailed description of the intervention */
//   description?: string;
//   /** Labels of arm groups that use this intervention */
//   armGroupLabels?: string[];
//   /** Alternative names for the intervention */
//   otherNames?: string[];
// }

/**
 * The types of interventions available in clinical trials
 */

enum InterventionType {
  // eslint-disable-next-line no-unused-vars
  BEHAVIORAL = 'BEHAVIORAL',
  // eslint-disable-next-line no-unused-vars
  BIOLOGICAL = 'BIOLOGICAL',
  // eslint-disable-next-line no-unused-vars
  COMBINATION_PRODUCT = 'COMBINATION_PRODUCT',
  // eslint-disable-next-line no-unused-vars
  DEVICE = 'DEVICE',
  // eslint-disable-next-line no-unused-vars
  DIAGNOSTIC_TEST = 'DIAGNOSTIC_TEST',
  // eslint-disable-next-line no-unused-vars
  DIETARY_SUPPLEMENT = 'DIETARY_SUPPLEMENT',
  // eslint-disable-next-line no-unused-vars
  DRUG = 'DRUG',
  // eslint-disable-next-line no-unused-vars
  GENETIC = 'GENETIC',
  // eslint-disable-next-line no-unused-vars
  PROCEDURE = 'PROCEDURE',
  // eslint-disable-next-line no-unused-vars
  RADIATION = 'RADIATION',
  // eslint-disable-next-line no-unused-vars
  OTHER = 'OTHER',
}

/**
 * Fetches clinical trials from ClinicalTrials.gov based on the provided parameters.
 *
 * Constructs a query string from the provided parameters, sends a request to the
 * ClinicalTrials.gov API, and processes the response to return a PagedStudyResponse.
 *
 * @param params - The parameters for fetching clinical trials.
 * @returns A promise that resolves to a PagedStudyResponse object.
 * @throws Will throw an error if the API request fails or the response cannot be processed.
 */
export async function getClinicalTrials(
  params: ClinicalTrialParams
): Promise<PagedStudyResponse> {
  console.debug('[CTG Tool] Starting clinical trials request', { params });

  const queryParams = new URLSearchParams();

  // Build the query parameters from the provided params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Convert array values to comma-separated strings
        console.debug(`[CTG Tool] Converting array parameter "${key}"`, {
          value,
        });
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  }

  // Construct the full API URL
  const apiUrl = `https://clinicaltrials.gov/api/v2/studies?${queryParams.toString()}`;
  console.debug('[CTG Tool] Constructed API URL', { apiUrl });

  try {
    // Make the API request to ClinicalTrials.gov
    console.debug('[CTG Tool] Sending request to ClinicalTrials.gov API');
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    // Check if the response is successful
    if (!response.ok) {
      console.error('[CTG Tool] API request failed', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`API request failed: ${response.statusText}`);
    }

    // Parse the response data
    console.debug('[CTG Tool] Received successful response, parsing JSON');
    const data = await response.json();

    // Check if the response contains studies
    if (!data.studies || !Array.isArray(data.studies)) {
      console.warn('[CTG Tool] No studies found in API response');
      return {
        studies: [],
        totalCount: data.totalCount,
        nextPageToken: data.nextPageToken,
      };
    }

    console.info('[CTG Tool] Successfully retrieved studies', {
      count: data.studies.length,
      hasNextPage: !!data.nextPageToken,
      totalCount: data.totalCount,
    });

    // Map the response to our StudyInfo interface
    const mappedStudies = data.studies.map(
      (study: { protocolSection: ProtocolSection }) => {
        const protocol = study.protocolSection;
        console.debug('[CTG Tool] Processing study', {
          nctId: protocol?.identificationModule?.nctId,
        });

        // Extract the relevant modules from the protocol section
        const identification = protocol?.identificationModule || {};
        const status = protocol?.statusModule || {};
        const sponsor = protocol?.sponsorCollaboratorsModule || {};
        const conditions = protocol?.conditionsModule || {};
        const interventions = protocol?.armsInterventionsModule || {};
        const design = protocol?.designModule || {};
        const description = protocol?.descriptionModule || {};
        const eligibility = protocol?.eligibilityModule || {};

        // Return the mapped StudyInfo object
        return {
          studyTitle: identification.officialTitle || '',
          nctNumber: identification.nctId || '',
          status: status.overallStatus || '',
          startDate: status.startDateStruct?.date || '',
          completionDate: status.completionDateStruct?.date || '',
          conditions: conditions.conditions?.join(', ') || '',
          interventions:
            interventions.interventions
              ?.map(
                (i: { type?: InterventionType; name: string }) =>
                  `${i.name}${i.type ? ` (${i.type})` : ''}`
              )
              .join('; ') || '',
          sponsor: sponsor.leadSponsor?.name || '',
          studyType: design.studyType || '',
          briefSummary: description.briefSummary || '',
          eligibilityModule: eligibility || {
            eligibilityCriteria: '',
            healthyVolunteers: false,
            sex: '',
            genderBased: false,
            genderDescription: '',
            minimumAge: '',
            maximumAge: '',
            stdAges: [],
            studyPopulation: '',
            samplingMethod: '',
          },
        };
      }
    );

    // Return the complete paged response
    return {
      studies: mappedStudies,
      totalCount: data.totalCount,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.error('[CTG Tool] Error fetching clinical trials', {
      error,
      params,
    });
    throw error;
  }
}

// Export the tool definition
export { CTG_TOOL_DEFINITION };
