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
