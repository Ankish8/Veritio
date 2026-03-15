import type { DemographicSection, DemographicField } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { StudyFlowBuilderState } from './types'
// DEMOGRAPHIC SECTION TEMPLATES

function createDemographicSectionTemplate(
  sectionType: 'professional-details' | 'technology' | 'custom',
  currentSectionsLength: number
): DemographicSection | null {
  // Generate unique ID for custom sections
  const customId = sectionType === 'custom'
    ? `custom-section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    : sectionType

  const templates: Record<string, DemographicSection> = {
    'professional-details': {
      id: 'professional-details',
      name: 'Professional / Work Details',
      position: currentSectionsLength,
      fields: [
        { id: 'employmentStatus', type: 'predefined', fieldType: 'employmentStatus', position: 0, enabled: false, required: false, mappedToScreeningQuestionId: null },
        { id: 'jobTitle', type: 'predefined', fieldType: 'jobTitle', position: 1, enabled: false, required: false, mappedToScreeningQuestionId: null },
        { id: 'industry', type: 'predefined', fieldType: 'industry', position: 2, enabled: false, required: false, mappedToScreeningQuestionId: null },
        { id: 'companySize', type: 'predefined', fieldType: 'companySize', position: 3, enabled: false, required: false, mappedToScreeningQuestionId: null },
        { id: 'yearsOfExperience', type: 'predefined', fieldType: 'yearsOfExperience', position: 4, enabled: false, required: false, mappedToScreeningQuestionId: null },
        { id: 'department', type: 'predefined', fieldType: 'department', position: 5, enabled: false, required: false, mappedToScreeningQuestionId: null },
      ],
    },
    'technology': {
      id: 'technology',
      name: 'Technology',
      position: currentSectionsLength,
      fields: [],
    },
    'custom': {
      id: customId,
      name: 'Custom Section',
      position: currentSectionsLength,
      fields: [],
      title: '',
      description: '',
    },
  }

  return templates[sectionType] || null
}
// DEMOGRAPHIC ACTIONS
export function createAddDemographicSection(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void,
  get: () => StudyFlowBuilderState
) {
  return (sectionType: 'professional-details' | 'technology' | 'custom'): string | null => {
    let newSectionId: string | null = null

    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      // Check if section already exists (only for non-custom types)
      if (sectionType !== 'custom') {
        const sectionExists = demographicProfile.sections.some((s) => s.id === sectionType)
        if (sectionExists) return {}
      }

      const newSection = createDemographicSectionTemplate(sectionType, demographicProfile.sections.length)
      if (!newSection) return {}

      newSectionId = newSection.id

      // Remove duplicates and add new section
      const uniqueSections = demographicProfile.sections.filter((s, index, self) =>
        index === self.findIndex((t) => t.id === s.id)
      )

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: [...uniqueSections, newSection],
            },
          },
        },
      }
    })

    return newSectionId
  }
}
export function createRemoveDemographicSection(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      // Cannot remove Basic Demographics section
      if (sectionId === 'basic-demographics') return {}

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.filter((s) => s.id !== sectionId),
            },
          },
        },
      }
    })
  }
}
export function createUpdateDemographicSection(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string, updates: Partial<DemographicSection>): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.map((s) =>
                s.id === sectionId ? { ...s, ...updates } : s
              ),
            },
          },
        },
      }
    })
  }
}
export function createAddDemographicCustomField(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string, field: Partial<DemographicField>): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      const section = demographicProfile.sections.find((s) => s.id === sectionId)
      if (!section) return {}

      const newField: DemographicField = {
        id: crypto.randomUUID(),
        type: 'custom',
        position: section.fields.length,
        enabled: true,
        required: false,
        questionText: field.questionText || '',
        placeholder: field.placeholder || '',
        mappedToScreeningQuestionId: null,
        ...field,
      }

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.map((s) =>
                s.id === sectionId
                  ? { ...s, fields: [...s.fields, newField] }
                  : s
              ),
            },
          },
        },
      }
    })
  }
}
export function createUpdateDemographicField(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string, fieldId: string, updates: Partial<DemographicField>): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.map((s) =>
                s.id === sectionId
                  ? {
                      ...s,
                      fields: s.fields.map((f) =>
                        f.id === fieldId ? { ...f, ...updates } : f
                      ),
                    }
                  : s
              ),
            },
          },
        },
      }
    })
  }
}
export function createRemoveDemographicField(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string, fieldId: string): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.map((s) =>
                s.id === sectionId
                  ? {
                      ...s,
                      fields: s.fields
                        .filter((f) => f.id !== fieldId)
                        .map((f, i) => ({ ...f, position: i })),
                    }
                  : s
              ),
            },
          },
        },
      }
    })
  }
}
export function createToggleDemographicFieldEnabled(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string, fieldId: string): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.map((s) =>
                s.id === sectionId
                  ? {
                      ...s,
                      fields: s.fields.map((f) =>
                        f.id === fieldId ? { ...f, enabled: !f.enabled } : f
                      ),
                    }
                  : s
              ),
            },
          },
        },
      }
    })
  }
}
export function createToggleDemographicFieldRequired(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (sectionId: string, fieldId: string): void => {
    set((state) => {
      const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
      if (!demographicProfile) return {}

      return {
        flowSettings: {
          ...state.flowSettings,
          participantIdentifier: {
            ...state.flowSettings.participantIdentifier,
            demographicProfile: {
              ...demographicProfile,
              sections: demographicProfile.sections.map((s) =>
                s.id === sectionId
                  ? {
                      ...s,
                      fields: s.fields.map((f) =>
                        f.id === fieldId ? { ...f, required: !f.required } : f
                      ),
                    }
                  : s
              ),
            },
          },
        },
      }
    })
  }
}
