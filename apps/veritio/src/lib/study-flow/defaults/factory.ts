import type { DemographicField, DemographicFieldType } from '../../supabase/study-flow-types'

/**
 * Create a predefined demographic field with standard defaults.
 * Reduces boilerplate for the 32-field demographic profile definition.
 */
export function makePredefinedField(
  id: string,
  fieldType: DemographicFieldType,
  position: number,
  width: 'full' | 'half' = 'half',
  enabled: boolean = false,
  required: boolean = false
): DemographicField {
  return {
    id,
    type: 'predefined',
    fieldType,
    position,
    enabled,
    required,
    mappedToScreeningQuestionId: null,
    width,
  }
}
