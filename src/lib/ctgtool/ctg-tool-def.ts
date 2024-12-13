/**
 * Definition of the CTG_TOOL, which retrieves data of studies matching query and filter parameters.
 * This tool provides complete access to the ClinicalTrials.gov API's /studies endpoint.
 *
 * The studies are returned page by page. If the response contains `nextPageToken`, use its value in `pageToken` to get the next page.
 * The last page will not contain `nextPageToken`. A page may have an empty `studies` array.
 * Request for each subsequent page **must** have the same parameters as for the first page, except `countTotal`, `pageSize`, and `pageToken` parameters.
 *
 * If neither queries nor filters are set, all studies will be returned.
 * If any query parameter contains only NCT IDs (comma- and/or space-separated), filters are ignored.
 *
 * `query.*` parameters are in Essie expression syntax. These parameters affect the ranking of studies if sorted by relevance.
 * See `sort` parameter for details.
 */
export const CTG_TOOL_DEFINITION = {
  name: 'get_trials',
  description: `Returns data of studies matching query and filter parameters from ClinicalTrials.gov.
The studies are returned page by page. If response contains \`nextPageToken\`, use its value in \`pageToken\` to get next page.
The last page will not contain \`nextPageToken\`. A page may have empty \`studies\` array.
Request for each subsequent page **must** have the same parameters as for the first page, except
\`countTotal\`, \`pageSize\`, and \`pageToken\` parameters.

If neither queries nor filters are set, all studies will be returned.
If any query parameter contains only NCT IDs (comma- and/or space-separated), filters are ignored.

\`query.*\` parameters are in Essie expression syntax. These parameters affect ranking of studies if sorted by relevance.
See \`sort\` parameter for details.

Responses:
1. Success (200 OK):
Returns paginated studies in the following format.
2. Error (400 Bad Request)`,

  parameters: {
    type: 'object',
    required: ['pageSize'],
    additionalProperties: false,
    strict: true,
    properties: {
      format: {
        type: 'string',
        enum: ['csv', 'json'],
        default: 'json',
        description: `Must be one of the following:
* \`csv\`- return CSV table with one page of study data; first page will contain header with column names; available fields are listed on CSV Download page
* \`json\`- return JSON with one page of study data; every study object is placed in a separate line; \`markup\` type fields format depends on \`markupFormat\` parameter`,
      },
      markupFormat: {
        type: 'string',
        enum: ['markdown', 'legacy'],
        default: 'markdown',
        description: `Format of \`markup\` type fields:
* \`markdown\`- markdown format
* \`legacy\`- compatible with classic PRS

Applicable only to \`json\` format.`,
      },
      'query.cond': {
        type: 'string',
        description:
          '"Conditions or disease" query in Essie expression syntax. See "ConditionSearch Area" on Search Areas for more details.',
        examples: ['lung cancer', '(head OR neck) AND pain'],
      },
      'query.term': {
        type: 'string',
        description:
          '"Other terms" query in Essie expression syntax. See "BasicSearch Area" on Search Areas for more details.',
        examples: ['AREA[LastUpdatePostDate]RANGE[2023-01-15,MAX]'],
      },
      'query.locn': {
        type: 'string',
        description:
          '"Location terms" query in Essie expression syntax. See "LocationSearch Area" on Search Areas for more details.',
      },
      'query.titles': {
        type: 'string',
        description:
          '"Title / acronym" query in Essie expression syntax. See "TitleSearch Area" on Search Areas for more details.',
      },
      'query.intr': {
        type: 'string',
        description:
          '"Intervention / treatment" query in Essie expression syntax. See "InterventionSearch Area" on Search Areas for more details.',
      },
      'query.outc': {
        type: 'string',
        description:
          '"Outcome measure" query in Essie expression syntax. See "OutcomeSearch Area" on Search Areas for more details.',
      },
      'query.spons': {
        type: 'string',
        description:
          '"Sponsor / collaborator" query in Essie expression syntax. See "SponsorSearch Area" on Search Areas for more details.',
      },
      'query.lead': {
        type: 'string',
        description:
          'Searches in "LeadSponsorName" field. See Study Data Structure for more details. The query is in Essie expression syntax.',
      },
      'query.id': {
        type: 'string',
        description:
          '"Study IDs" query in Essie expression syntax. See "IdSearch Area" on Search Areas for more details.',
      },
      'query.patient': {
        type: 'string',
        description:
          'See "PatientSearch Area" on Search Areas for more details.',
      },
      'filter.overallStatus': {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'ACTIVE_NOT_RECRUITING',
            'COMPLETED',
            'ENROLLING_BY_INVITATION',
            'NOT_YET_RECRUITING',
            'RECRUITING',
            'SUSPENDED',
            'TERMINATED',
            'WITHDRAWN',
            'AVAILABLE',
            'NO_LONGER_AVAILABLE',
            'TEMPORARILY_NOT_AVAILABLE',
            'APPROVED_FOR_MARKETING',
            'WITHHELD',
            'UNKNOWN',
          ],
        },
        style: 'pipeDelimited',
        explode: false,
        description: 'Filter by comma- or pipe-separated list of statuses',
        examples: [['NOT_YET_RECRUITING', 'RECRUITING'], ['COMPLETED']],
      },
      'filter.geo': {
        type: 'string',
        pattern:
          '^distance\\(-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,\\d+(\\.\\d+)?(km|mi)?\\)$',
        description: `Filter by geo-function. Currently only distance function is supported.
Format: \`distance(latitude,longitude,distance)\``,
        examples: ['distance(39.0035707,-77.1013313,50mi)'],
      },
      'filter.ids': {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[Nn][Cc][Tt]0*[1-9]\\d{0,7}$',
        },
        style: 'pipeDelimited',
        explode: false,
        description: `Filter by comma- or pipe-separated list of NCT IDs (a.k.a. ClinicalTrials.gov identifiers).
The provided IDs will be searched in NCTId and NCTIdAlias fields.`,
        examples: [['NCT04852770', 'NCT01728545', 'NCT02109302']],
      },
      'filter.advanced': {
        type: 'string',
        description: 'Filter by query in Essie expression syntax',
        examples: [
          'AREA[StartDate]2022',
          'AREA[MinimumAge]RANGE[MIN, 16 years] AND AREA[MaximumAge]RANGE[16 years, MAX]',
        ],
      },
      'filter.synonyms': {
        type: 'array',
        items: {
          type: 'string',
        },
        style: 'pipeDelimited',
        explode: false,
        description:
          'Filter by comma- or pipe-separated list of `area`:`synonym_id` pairs',
        examples: [['ConditionSearch:1651367', 'BasicSearch:2013558']],
      },
      aggFilters: {
        type: 'string',
        description:
          'Apply aggregation filters, aggregation counts will not be provided. The value is comma- or pipe-separated list of pairs `filter_id`:`space-separated list of option keys` for the checked options.',
        examples: ['results:with,status:com', 'status:not rec,sex:f,healthy:y'],
      },
      geoDecay: {
        type: 'string',
        pattern:
          '^func:(gauss|exp|linear),scale:(\\d+(\\.\\d+)?(km|mi)),offset:(\\d+(\\.\\d+)?(km|mi)),decay:(\\d+(\\.\\d+)?)$',
        default: 'func:exp,scale:300mi,offset:0mi,decay:0.5',
        description: `Set proximity factor by distance from \`filter.geo\` location to the closest LocationGeoPoint of a study.
Ignored, if \`filter.geo\` parameter is not set or response contains more than 10,000 studies.`,
        examples: [
          'func:linear,scale:100km,offset:10km,decay:0.1',
          'func:gauss,scale:500mi,offset:0mi,decay:0.3',
        ],
      },
      fields: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^([a-zA-Z][a-zA-Z0-9\\-. ]*)|(@query)$',
        },
        style: 'pipeDelimited',
        explode: false,
        minItems: 1,
        description: `If specified, must be non-empty comma- or pipe-separated list of fields to return. If unspecified, all fields will be returned.
Order of the fields does not matter.

For \`csv\` format, specify list of columns. The column names are available on CSV Download.

For \`json\` format, every list item is either area name, piece name, field name, or special name.
If a piece or a field is a branch node, all descendant fields will be included.
All area names are available on Search Areas, the piece and field names — on Data Structure and also can be retrieved at \`/studies/metadata\` endpoint.
There is a special name, \`@query\`, which expands to all fields queried by search.`,
        examples: [
          ['NCTId', 'BriefTitle', 'OverallStatus', 'HasResults'],
          ['ProtocolSection'],
        ],
      },
      sort: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^(([a-zA-Z][a-zA-Z0-9\\-. ]*)|(@relevance))(:(asc|desc))?$',
        },
        style: 'pipeDelimited',
        explode: false,
        maxItems: 2,
        default: [],
        description: `Comma- or pipe-separated list of sorting options of the studies. The returning studies are not sorted by default for a performance reason.
Every list item contains a field/piece name and an optional sort direction (\`asc\` for ascending or \`desc\` for descending) after colon character.

All piece and field names can be found on Data Structure and also can be retrieved at \`/studies/metadata\` endpoint. Currently, only date and numeric fields are allowed for sorting.
There is a special "field" \`@relevance\` to sort by relevance to a search query.

Studies missing sort field are always last. Default sort direction:
* Date field - \`desc\`
* Numeric field - \`asc\`
* \`@relevance\` - \`desc\``,
        examples: [
          ['@relevance'],
          ['LastUpdatePostDate'],
          ['EnrollmentCount:desc', 'NumArmGroups'],
        ],
      },
      countTotal: {
        type: 'boolean',
        default: false,
        description: `Count total number of studies in all pages and return \`totalCount\` field with first page, if \`true\`.
For CSV, the result can be found in \`x-total-count\` response header.
The parameter is ignored for the subsequent pages.`,
      },
      pageSize: {
        type: 'integer',
        minimum: 0,
        format: 'int32',
        default: 10,
        description: `Page size is maximum number of studies to return in response. It does not have to be the same for every page.
If not specified or set to 0, the default value will be used. It will be coerced down to 1,000, if greater than that.`,
        examples: [2, 100],
      },
      pageToken: {
        type: 'string',
        description: `Token to get next page. Set it to a \`nextPageToken\` value returned with the previous page in JSON format.
For CSV, it can be found in \`x-next-page-token\` response header.
Do not specify it for first page.`,
      },
    },
  },
};
