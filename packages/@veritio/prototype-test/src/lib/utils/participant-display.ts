/**
 * Participant Display Utilities
 *
 * Provides consistent participant name resolution across all analysis views.
 * Handles the fallback chain: primary field → secondary field → "P{n}" format.
 */

import type {
  ParticipantDisplaySettings,
  ParticipantDisplayField,
  ParticipantDemographicData,
  ParticipantIdentifierSettings,
} from '../supabase/study-flow-types';

export interface ParticipantDisplayOption {
  value: ParticipantDisplayField;
  label: string;
}

const CANONICAL_DISPLAY_OPTIONS: Array<{
  value: 'email' | 'firstName' | 'lastName';
  label: string;
}> = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
];

export function getParticipantDisplayOptions(
  settings: ParticipantIdentifierSettings
): ParticipantDisplayOption[] {
  const enabledFields = (settings.demographicProfile?.sections ?? [])
    .flatMap((section) => section.fields)
    .filter((field) => field.enabled);
  const enabledCanonicalFields = new Set(
    enabledFields
      .filter((field) => field.type === 'predefined' && field.fieldType)
      .map((field) => field.fieldType)
  );
  const options: ParticipantDisplayOption[] = [];

  if (
    enabledCanonicalFields.has('firstName') ||
    enabledCanonicalFields.has('lastName')
  ) {
    options.push({ value: 'fullName', label: 'Full Name' });
  }

  for (const option of CANONICAL_DISPLAY_OPTIONS) {
    if (enabledCanonicalFields.has(option.value)) {
      options.push(option);
    }
  }

  for (const field of enabledFields) {
    if (field.type !== 'custom') continue;
    const label = field.questionText?.trim() || 'Custom Field';
    options.push({ value: `custom:${field.id}`, label: `${label} (Custom)` });
  }

  options.push({ value: 'participantNumber', label: 'Participant Number' });
  return options;
}

export function isParticipantDisplayFieldAvailable(
  settings: ParticipantIdentifierSettings,
  field: ParticipantDisplayField
): boolean {
  if (field === 'none') return true;
  return getParticipantDisplayOptions(settings).some((option) => option.value === field);
}

export interface ParticipantDisplayInput {
  index: number;
  demographics?: ParticipantDemographicData | null;
}
export interface ResolvedParticipantDisplay {
  primary: string;
  secondary: string | null;
}
const CUSTOM_FIELD_PREFIX = 'custom:';
function resolveStringValue(
  demographics: ParticipantDemographicData,
  key: string
): string | null {
  const value = demographics[key];
  return typeof value === 'string' ? value.trim() || null : null;
}
function resolveField(
  field: ParticipantDisplayField,
  data: ParticipantDisplayInput
): string | null {
  if (field === 'none') return null;
  if (field === 'participantNumber') return `P${data.index}`;

  const demographics = data.demographics;
  if (!demographics) return null;

  if (field.startsWith(CUSTOM_FIELD_PREFIX)) {
    const fieldId = field.slice(CUSTOM_FIELD_PREFIX.length);
    return fieldId ? resolveStringValue(demographics, fieldId) : null;
  }

  switch (field) {
    case 'email':
      return resolveStringValue(demographics, 'email');

    case 'firstName':
      return resolveStringValue(demographics, 'firstName');

    case 'lastName':
      return resolveStringValue(demographics, 'lastName');

    case 'fullName': {
      const first = resolveStringValue(demographics, 'firstName');
      const last = resolveStringValue(demographics, 'lastName');
      if (first && last) return `${first} ${last}`;
      if (first) return first;
      if (last) return last;
      return null;
    }

    default:
      return null;
  }
}
export function resolveParticipantDisplay(
  settings: ParticipantDisplaySettings | null | undefined,
  data: ParticipantDisplayInput
): ResolvedParticipantDisplay {
  // Anonymous mode: Always use "Participant X" format
  if (!settings) {
    return {
      primary: `Participant ${data.index}`,
      secondary: null,
    };
  }

  // Try to resolve primary field
  let primary = resolveField(settings.primaryField, data);

  // If primary is empty, try secondary as fallback (only if different)
  if (
    !primary &&
    settings.secondaryField !== 'none' &&
    settings.secondaryField !== settings.primaryField
  ) {
    primary = resolveField(settings.secondaryField, data);
  }

  // Final fallback to "P{n}" format
  if (!primary) {
    primary = `P${data.index}`;
  }

  // Resolve secondary (only if configured and different from primary)
  let secondary: string | null = null;
  if (settings.secondaryField !== 'none') {
    const resolvedSecondary = resolveField(settings.secondaryField, data);
    // Don't show secondary if it's the same as primary (deduplication)
    if (resolvedSecondary && resolvedSecondary !== primary) {
      secondary = resolvedSecondary;
    }
  }

  return { primary, secondary };
}
export function getDisplaySettingsFromStudy(
  identifierType: 'anonymous' | 'demographic_profile' | undefined,
  displaySettings?: ParticipantDisplaySettings | null
): ParticipantDisplaySettings | null {
  // Anonymous mode - no display settings
  if (!identifierType || identifierType === 'anonymous') {
    return null;
  }

  // Return configured settings or defaults
  return (
    displaySettings || {
      primaryField: 'fullName',
      secondaryField: 'email',
    }
  );
}

/**
 * Extract demographic data from participant metadata.
 * Handles both formats:
 * - Nested: { demographic_data: { firstName, lastName, email, ... } }
 * - Direct: { firstName, lastName, email, ... } (legacy format)
 *
 * @param metadata - Raw metadata from participant record
 * @returns Demographic data or null if not found
 */
export function extractDemographicsFromMetadata(
  metadata: unknown
): ParticipantDemographicData | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const rawMetadata = metadata as Record<string, unknown>;

  // Check for nested demographic_data (standard format from submissions)
  if ('demographic_data' in rawMetadata && rawMetadata.demographic_data) {
    const demographicData = rawMetadata.demographic_data;
    if (typeof demographicData === 'object' && demographicData !== null) {
      return demographicData as ParticipantDemographicData;
    }
  }

  // Fallback: demographics stored directly in metadata (legacy format)
  if ('firstName' in rawMetadata || 'lastName' in rawMetadata || 'email' in rawMetadata) {
    return rawMetadata as unknown as ParticipantDemographicData;
  }

  return null;
}
