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
} from '@veritio/core';
export interface ParticipantDisplayInput {
  index: number;
  demographics?: ParticipantDemographicData | null;
}
export interface ResolvedParticipantDisplay {
  primary: string;
  secondary: string | null;
}
function resolveField(
  field: ParticipantDisplayField,
  data: ParticipantDisplayInput
): string | null {
  if (field === 'none') return null;

  const demographics = data.demographics;
  if (!demographics) return null;

  switch (field) {
    case 'email':
      return demographics.email?.trim() || null;

    case 'firstName':
      return demographics.firstName?.trim() || null;

    case 'lastName':
      return demographics.lastName?.trim() || null;

    case 'fullName': {
      const first = demographics.firstName?.trim();
      const last = demographics.lastName?.trim();
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
