/**
 * Demographic Field Mapping Utility
 *
 * Maps demographic data between Panel participant profiles and Study participant metadata.
 * Handles field name differences and structure transformations.
 *
 * Panel Demographics (panel_participants.demographics):
 * - Uses snake_case: country, age_range, job_role, company_size
 * - Flat structure
 *
 * Study Demographics (participants.metadata):
 * - Uses camelCase: ageRange, jobTitle, companySize
 * - Location is nested: { country, countryCode, state, stateCode, city }
 *
 * @example
 * ```ts
 * const panelData = { country: 'United States', age_range: '25-34', job_role: 'Engineer' }
 * const studyData = mapPanelToStudyDemographics(panelData)
 * // { location: { country: 'United States' }, ageRange: '25-34', jobTitle: 'Engineer' }
 * ```
 */

import type { Demographics } from './supabase/panel-types'
import type { ParticipantDemographicData } from './supabase/study-flow-types'

/**
 * Field mapping from panel field names to study field names
 * Panel uses snake_case, Study uses camelCase
 */
export const PANEL_TO_STUDY_FIELD_MAP: Record<string, string> = {
  // Direct mappings (snake_case → camelCase)
  age_range: 'ageRange',
  job_role: 'jobTitle',
  company_size: 'companySize',

  // Same name mappings
  gender: 'gender',
  industry: 'industry',
  language: 'preferredLanguage',

  // Special handling (country → location.country)
  country: 'location.country',
}

/**
 * Reverse mapping from study field names to panel field names
 */
export const STUDY_TO_PANEL_FIELD_MAP: Record<string, string> = {
  ageRange: 'age_range',
  jobTitle: 'job_role',
  companySize: 'company_size',
  gender: 'gender',
  industry: 'industry',
  preferredLanguage: 'language',
  'location.country': 'country',
}

/**
 * Maps panel participant demographics to study participant metadata format
 *
 * @param panelData - Demographics from panel_participants table
 * @returns Partial study demographic data for pre-filling
 */
export function mapPanelToStudyDemographics(
  panelData: Demographics | null | undefined
): Partial<ParticipantDemographicData> {
  if (!panelData) return {}

  const result: Partial<ParticipantDemographicData> = {}

  // Map each panel field to study field
  for (const [panelKey, studyKey] of Object.entries(PANEL_TO_STUDY_FIELD_MAP)) {
    const value = panelData[panelKey as keyof Demographics]
    if (value === undefined || value === null || value === '') continue

    // Handle nested location field
    if (studyKey === 'location.country') {
      result.location = {
        ...result.location,
        country: value,
      }
    } else {
      // Direct assignment for non-nested fields
      ;(result as Record<string, unknown>)[studyKey] = value
    }
  }

  // Add source tracking
  if (Object.keys(result).length > 0) {
    result._sources = result._sources || {}
    for (const key of Object.keys(result)) {
      if (key !== '_sources' && key !== 'location') {
        result._sources[key] = 'panel'
      }
    }
    if (result.location) {
      result._sources['location.country'] = 'panel'
    }
  }

  return result
}

/**
 * Maps study participant demographics back to panel demographics format
 * Useful for syncing updates back to panel
 *
 * @param studyData - Demographics from participants.metadata
 * @returns Panel demographics format
 */
export function mapStudyToPanelDemographics(
  studyData: Partial<ParticipantDemographicData> | null | undefined
): Partial<Demographics> {
  if (!studyData) return {}

  const result: Partial<Demographics> = {}

  // Map direct fields
  if (studyData.ageRange) result.age_range = studyData.ageRange
  if (studyData.jobTitle) result.job_role = studyData.jobTitle
  if (studyData.companySize) result.company_size = studyData.companySize
  if (studyData.gender) result.gender = studyData.gender
  if (studyData.industry) result.industry = studyData.industry
  if (studyData.preferredLanguage) result.language = studyData.preferredLanguage

  // Map nested location
  if (studyData.location?.country) {
    result.country = studyData.location.country
  }

  return result
}

/**
 * Merges pre-filled data with existing form values
 * Only fills empty fields, doesn't overwrite user input
 *
 * @param prefillData - Data to pre-fill from panel
 * @param existingData - Current form values
 * @returns Merged data with pre-fills only for empty fields
 */
export function mergePrefillData(
  prefillData: Partial<ParticipantDemographicData>,
  existingData: Partial<ParticipantDemographicData>
): Partial<ParticipantDemographicData> {
  const result = { ...existingData }

  for (const [key, value] of Object.entries(prefillData)) {
    if (key === '_sources') continue

    // Only fill if existing value is empty
    const existingValue = (result as Record<string, unknown>)[key]
    if (existingValue === undefined || existingValue === null || existingValue === '') {
      ;(result as Record<string, unknown>)[key] = value
    }
  }

  // Merge _sources
  if (prefillData._sources) {
    result._sources = {
      ...prefillData._sources,
      ...result._sources,
    }
  }

  return result
}

/**
 * Gets the list of field types that can be pre-filled from panel data
 */
export function getPreFillableFieldTypes(): string[] {
  return Object.values(PANEL_TO_STUDY_FIELD_MAP).map((key) =>
    key.includes('.') ? key.split('.')[0] : key
  )
}

/**
 * Checks if a specific study field can be pre-filled from panel
 */
export function canPreFillField(studyFieldType: string): boolean {
  return Object.values(PANEL_TO_STUDY_FIELD_MAP).some(
    (mappedKey) => mappedKey === studyFieldType || mappedKey.startsWith(studyFieldType + '.')
  )
}
