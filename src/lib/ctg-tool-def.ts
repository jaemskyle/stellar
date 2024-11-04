/**
 * Definition of the CTG_TOOL, which retrieves data of studies matching query and filter parameters.
 * The studies are returned page by page. If the response contains `nextPageToken`, use its value in `pageToken` to get the next page.
 * The last page will not contain `nextPageToken`. A page may have an empty `studies` array.
 * Request for each subsequent page **must** have the same parameters as for the first page, except `countTotal`, `pageSize`, and `pageToken` parameters.
 *
 * If neither queries nor filters are set, all studies will be returned.
 * If any query parameter contains only NCT IDs (comma- and/or space-separated), filters are ignored.
 *
 * `query.*` parameters are in Essie expression syntax. These parameters affect the ranking of studies if sorted by relevance.
 * See `sort` parameter for details.
 *
 * `filter.*` and `postFilter.*` parameters have the same effect as there is no aggregation calculation.
 * Both are available just to simplify applying parameters from the search request.
 * Both do not affect the ranking of studies.
 */
export const CTG_TOOL_DEFINITION = {
  name: 'get_trials',
  description: `Returns data of studies matching query and filter parameters. The studies are returned page by page.
  If response contains \`nextPageToken\`, use its value in \`pageToken\` to get the next page.
  The last page will not contain \`nextPageToken\`. A page may have an empty \`studies\` array.
  Request for each subsequent page **must** have the same parameters as for the first page, except
  \`countTotal\`, \`pageSize\`, and \`pageToken\` parameters.

  If neither queries nor filters are set, all studies will be returned.
  If any query parameter contains only NCT IDs (comma- and/or space-separated), filters are ignored.

  \`query.*\` parameters are in Essie expression syntax. These parameters affect the ranking of studies if sorted by relevance.
  See \`sort\` parameter for details.

  \`filter.*\` and \`postFilter.*\` parameters have the same effect as there is no aggregation calculation.
  Both are available just to simplify applying parameters from the search request.
  Both do not affect the ranking of studies.`,
  parameters: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['csv', 'json'],
        description: `Must be one of the following:
  * \`csv\` - return CSV table with one page of study data; first page will contain header with column names; available fields are listed on CSV Download page
  * \`json\` - return JSON with one page of study data; every study object is placed in a separate line; \`markup\` type fields format depends on \`markupFormat\` parameter`,
      },
      markupFormat: {
        type: 'string',
        enum: ['markdown', 'legacy'],
        description: `Format of \`markup\` type fields:
  * \`markdown\` - markdown format
  * \`legacy\` - compatible with classic PRS

  Applicable only to \`json\` format.`,
      },
      'query.cond': {
        type: 'string',
        description: `"Conditions or disease" query in Essie expression syntax. See "ConditionSearch Area" on Search Areas for more details.`,
      },
      'query.term': {
        type: 'string',
        description: `"Other terms" query in Essie expression syntax. See "BasicSearch Area" on Search Areas for more details.`,
      },
      'query.locn': {
        type: 'string',
        description: `"Location terms" query in Essie expression syntax. See "LocationSearch Area" on Search Areas for more details.`,
      },
      'query.titles': {
        type: 'string',
        description: `"Title / acronym" query in Essie expression syntax. See "TitleSearch Area" on Search Areas for more details.`,
      },
      'query.intr': {
        type: 'string',
        description: `"Intervention / treatment" query in Essie expression syntax. See "InterventionSearch Area" on Search Areas for more details.`,
      },
      'query.outc': {
        type: 'string',
        description: `"Outcome measure" query in Essie expression syntax. See "OutcomeSearch Area" on Search Areas for more details.`,
      },
      'query.spons': {
        type: 'string',
        description: `"Sponsor / collaborator" query in Essie expression syntax. See "SponsorSearch Area" on Search Areas for more details.`,
      },
      'query.lead': {
        type: 'string',
        description: `Searches in "LeadSponsorName" field. See Study Data Structure for more details. The query is in Essie expression syntax.`,
      },
      'query.id': {
        type: 'string',
        description: `"Study IDs" query in Essie expression syntax. See "IdSearch Area" on Search Areas for more details.`,
      },
      'query.patient': {
        type: 'string',
        description: `See "PatientSearch Area" on Search Areas for more details.`,
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
        description: 'Filter by comma- or pipe-separated list of statuses',
      },
      'filter.geo': {
        type: 'string',
        pattern:
          '^distance\\(-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,\\d+(\\.\\d+)?(km|mi)?\\)$',
        description: `Filter by geo-function. Currently only distance function is supported.
  Format: \`distance(latitude,longitude,distance)\``,
      },
      'filter.ids': {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[Nn][Cc][Tt]0*[1-9]\\d{0,7}$',
        },
        description: `Filter by comma- or pipe-separated list of NCT IDs (a.k.a. ClinicalTrials.gov identifiers).
  The provided IDs will be searched in NCTId and NCTIdAlias fields.`,
      },
      'filter.advanced': {
        type: 'string',
        description: 'Filter by query in Essie expression syntax',
      },
      'filter.synonyms': {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Filter by comma- or pipe-separated list of `area`:`synonym_id` pairs',
      },
      'postFilter.overallStatus': {
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
        description: 'Filter by comma- or pipe-separated list of statuses',
      },
      'postFilter.geo': {
        type: 'string',
        pattern:
          '^distance\\(-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?,\\d+(\\.\\d+)?(km|mi)?\\)$',
        description: `Filter by geo-function. Currently only distance function is supported.
  Format: \`distance(latitude,longitude,distance)\``,
      },
      'postFilter.ids': {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^[Nn][Cc][Tt]0*[1-9]\\d{0,7}$',
        },
        description: `Filter by comma- or pipe-separated list of NCT IDs (a.k.a. ClinicalTrials.gov identifiers).
  The provided IDs will be searched in NCTId and NCTIdAlias fields.`,
      },
      'postFilter.advanced': {
        type: 'string',
        description: 'Filter by query in Essie expression syntax',
      },
      'postFilter.synonyms': {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Filter by comma- or pipe-separated list of `area`:`synonym_id` pairs',
      },
      aggFilters: {
        type: 'string',
        description:
          'Apply aggregation filters, aggregation counts will not be provided. The value is comma- or pipe-separated list of pairs `filter_id`:`space-separated list of option keys` for the checked options.',
      },
      geoDecay: {
        type: 'string',
        pattern:
          '^func:(gauss|exp|linear),scale:(\\d+(\\.\\d+)?(km|mi)),offset:(\\d+(\\.\\d+)?(km|mi)),decay:(\\d+(\\.\\d+)?)$',
        description: `Set proximity factor by distance from \`filter.geo\` location to the closest LocationGeoPoint of a study.
  Ignored, if \`filter.geo\` parameter is not set or response contains more than 10,000 studies.`,
      },
      fields: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^([a-zA-Z][a-zA-Z0-9\\-. ]*)|(@query)$',
        },
        description: `If specified, must be non-empty comma- or pipe-separated list of fields to return. If unspecified, all fields will be returned.
  Order of the fields does not matter.

  For \`csv\` format, specify list of columns. The column names are available on CSV Download.

  For \`json\` format, every list item is either area name, piece name, field name, or special name.
  If a piece or a field is a branch node, all descendant fields will be included.
  All area names are available on Search Areas, the piece and field names — on Data Structure and also can be retrieved at \`/studies/metadata\` endpoint.
  There is a special name, \`@query\`, which expands to all fields queried by search.`,
      },
      sort: {
        type: 'array',
        items: {
          type: 'string',
          pattern: '^(([a-zA-Z][a-zA-Z0-9\\-. ]*)|(@relevance))(:(asc|desc))?$',
        },
        description: `Comma- or pipe-separated list of sorting options of the studies. The returning studies are not sorted by default for a performance reason.
  Every list item contains a field/piece name and an optional sort direction (\`asc\` for ascending or \`desc\` for descending) after colon character.

  All piece and field names can be found on Data Structure and also can be retrieved at \`/studies/metadata\` endpoint. Currently, only date and numeric fields are allowed for sorting.
  There is a special "field" \`@relevance\` to sort by relevance to a search query.

  Studies missing sort field are always last. Default sort direction:
  * Date field - \`desc\`
  * Numeric field - \`asc\`
  * \`@relevance\` - \`desc\``,
      },
      countTotal: {
        type: 'boolean',
        description: `Count total number of studies in all pages and return \`totalCount\` field with first page, if \`true\`.
  For CSV, the result can be found in \`x-total-count\` response header.
  The parameter is ignored for the subsequent pages.`,
      },
      pageSize: {
        type: 'integer',
        description: `Page size is maximum number of studies to return in response. It does not have to be the same for every page.
  If not specified or set to 0, the default value will be used. It will be coerced down to 1,000, if greater than that.`,
      },
      pageToken: {
        type: 'string',
        description: `Token to get next page. Set it to a \`nextPageToken\` value returned with the previous page in JSON format.
  For CSV, it can be found in \`x-next-page-token\` response header.
  Do not specify it for first page.`,
      },
    },
    required: ['pageSize'],
  },
};
