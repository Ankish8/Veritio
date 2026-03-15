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
} from '../supabase/study-flow-types';

/**
 * Input data required to resolve participant display
 */
export interface ParticipantDisplayInput {
  /** 1-based participant index (e.g., 1, 2, 3...) */
  index: number;
  /** Demographic data from participant.metadata */
  demographics?: ParticipantDemographicData | null;
}

/**
 * Resolved display values for a participant
 */
export interface ResolvedParticipantDisplay {
  /** Primary display text (always has a value, falls back to "P{n}") */
  primary: string;
  /** Secondary display text (null if not configured or same as primary) */
  secondary: string | null;
}

/**
 * Resolves a single display field from participant data
 */
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

/**
 * Resolves how a participant should be displayed in analysis views.
 *
 * Fallback chain:
 * 1. Try primary field
 * 2. If empty, try secondary field
 * 3. If still empty, use "P{index}" format
 *
 * @param settings - Display settings from study config (null = anonymous mode)
 * @param data - Participant data including index and demographics
 * @returns Resolved primary and secondary display strings
 *
 * @example
 * // Anonymous mode
 * resolveParticipantDisplay(null, { index: 1, demographics: null })
 * // => { primary: "P1", secondary: null }
 *
 * @example
 * // With full data
 * resolveParticipantDisplay(
 *   { primaryField: 'fullName', secondaryField: 'email' },
 *   { index: 1, demographics: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' } }
 * )
 * // => { primary: "John Doe", secondary: "john@example.com" }
 *
 * @example
 * // No name data - falls back through chain
 * resolveParticipantDisplay(
 *   { primaryField: 'fullName', secondaryField: 'email' },
 *   { index: 5, demographics: { email: 'user@example.com' } }
 * )
 * // => { primary: "user@example.com", secondary: null }
 *
 * @example
 * // No data at all
 * resolveParticipantDisplay(
 *   { primaryField: 'fullName', secondaryField: 'email' },
 *   { index: 3, demographics: {} }
 * )
 * // => { primary: "P3", secondary: null }
 */
export function resolveParticipantDisplay(
  settings: ParticipantDisplaySettings | null | undefined,
  data: ParticipantDisplayInput
): ResolvedParticipantDisplay {
  // Anonymous mode: Use "PX" format for consistency with configured mode
  if (!settings) {
    return {
      primary: `P${data.index}`,
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

/**
 * Helper to get display settings from study settings.
 * Returns null for anonymous mode, otherwise returns settings with defaults.
 *
 * @param identifierType - The identifier type from study settings
 * @param displaySettings - Optional display settings from study settings
 * @returns Display settings or null for anonymous mode
 */
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
/**
 * Parse url_tags from raw participant data.
 * Safely validates the shape and returns a typed record or null.
 */
export function parseUrlTags(rawUrlTags: unknown): Record<string, string> | null {
  if (rawUrlTags && typeof rawUrlTags === 'object' && !Array.isArray(rawUrlTags)) {
    return rawUrlTags as Record<string, string>
  }
  return null
}

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
