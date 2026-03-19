import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  StudyMeta,
  FileAttachment,
  ClosingRule,
  BrandingSettings,
  SaveStatus,
  DeepPartial,
  StylePresetId,
  RadiusOption,
  ThemeMode,
  ResponsePreventionSettings,
  NotificationSettings,
  SessionRecordingSettings,
  SharingSettings,
} from '../builder/shared/types'
import {
  DEFAULT_STUDY_META,
  DEFAULT_RESPONSE_PREVENTION,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SESSION_RECORDING,
  DEFAULT_SHARING_SETTINGS,
} from '../builder/shared/types'
import { deepEqual, createSnapshot } from '../lib/utils/deep-equal'

/** Input type for loadFromStudy, representing the database study row */
export interface LoadFromStudyInput {
  id: string
  title: string
  description?: string | null
  status: string
  created_at: string
  updated_at?: string | null
  launched_at?: string | null
  participant_count?: number
  purpose?: string | null
  participant_requirements?: string | null
  folder_id?: string | null
  file_attachments?: FileAttachment[]
  url_slug?: string | null
  language?: string
  password?: string | null
  session_recording_settings?: SessionRecordingSettings
  closing_rule?: ClosingRule
  response_prevention_settings?: ResponsePreventionSettings
  email_notification_settings?: NotificationSettings
  branding?: BrandingSettings
  sharing_settings?: SharingSettings
}

/** Maps a database study row to the StudyMeta shape used by the store */
function mapStudyToMeta(study: LoadFromStudyInput): StudyMeta {
  return {
    title: study.title,
    description: study.description || null,
    purpose: study.purpose || null,
    participantRequirements: study.participant_requirements || null,
    folderId: study.folder_id || null,
    fileAttachments: study.file_attachments || [],
    urlSlug: study.url_slug || null,
    language: study.language || 'en-US',
    password: study.password || null,
    sessionRecordingSettings: study.session_recording_settings || DEFAULT_SESSION_RECORDING,
    closingRule: study.closing_rule || { type: 'none' },
    responsePrevention: study.response_prevention_settings || DEFAULT_RESPONSE_PREVENTION,
    notificationSettings: study.email_notification_settings || DEFAULT_NOTIFICATION_SETTINGS,
    branding: study.branding || {},
    sharingSettings: study.sharing_settings || DEFAULT_SHARING_SETTINGS,
    status: study.status as StudyMeta['status'],
    createdAt: study.created_at,
    updatedAt: study.updated_at || null,
    launchedAt: study.launched_at || null,
    participantCount: study.participant_count || 0,
  }
}

/** Shallow-merge a patch into state.meta */
function applyMetaPatch(state: { meta: StudyMeta }, patch: Partial<StudyMeta>): { meta: StudyMeta } {
  return { meta: { ...state.meta, ...patch } }
}

/** Update a branding sub-field */
function applyBrandingPatch(state: { meta: StudyMeta }, patch: Partial<BrandingSettings>): { meta: StudyMeta } {
  return { meta: { ...state.meta, branding: { ...state.meta.branding, ...patch } } }
}

// Snapshot type for dirty detection
interface StudyMetaSnapshot {
  meta: StudyMeta
}

interface StudyMetaState {
  // Data
  meta: StudyMeta

  // Snapshot for dirty detection
  _snapshot: StudyMetaSnapshot | null

  // Meta
  studyId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isHydrated: boolean

  // Details Tab Actions
  setTitle: (title: string) => void
  setDescription: (description: string | null) => void
  setPurpose: (purpose: string | null) => void
  setParticipantRequirements: (requirements: string | null) => void
  setFolderId: (folderId: string | null) => void
  addFileAttachment: (file: FileAttachment) => void
  removeFileAttachment: (fileId: string) => void
  setFileAttachments: (files: FileAttachment[]) => void

  // Settings Tab Actions
  setUrlSlug: (slug: string | null) => void
  setLanguage: (language: string) => void
  setPassword: (password: string | null) => void
  // Session Recording Actions
  setSessionRecordingSettings: (settings: SessionRecordingSettings) => void
  updateSessionRecordingSettings: (updates: Partial<SessionRecordingSettings>) => void
  setClosingRule: (rule: ClosingRule) => void
  updateClosingRule: (updates: Partial<ClosingRule>) => void
  // Response Prevention Actions
  setResponsePrevention: (settings: ResponsePreventionSettings) => void
  updateResponsePrevention: (updates: Partial<ResponsePreventionSettings>) => void
  // Email Notification Actions
  setNotificationSettings: (settings: NotificationSettings) => void
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void
  toggleNotificationTrigger: (trigger: keyof NotificationSettings['triggers'], value: boolean) => void
  toggleMilestone: (milestone: number) => void

  // Branding Tab Actions
  setBranding: (branding: BrandingSettings) => void
  updateBranding: (updates: DeepPartial<BrandingSettings>) => void
  setLogo: (logo: BrandingSettings['logo']) => void
  setLogoSize: (size: number) => void
  removeLogo: () => void
  setSocialImage: (image: BrandingSettings['socialImage']) => void
  removeSocialImage: () => void
  setPrimaryColor: (color: string | undefined) => void
  setButtonText: (key: 'continue' | 'finished', text: string | undefined) => void
  setCardSortInstructions: (instructions: string | undefined) => void
  // Style customization actions
  setStylePreset: (preset: StylePresetId) => void
  setRadiusOption: (radius: RadiusOption) => void
  setThemeMode: (mode: ThemeMode) => void

  // Sharing Tab Actions
  setSharingSettings: (settings: SharingSettings) => void
  updateSharingSettings: (updates: DeepPartial<SharingSettings>) => void
  updateRedirectSettings: (updates: Partial<SharingSettings['redirects']>) => void
  updateInterceptSettings: (updates: Partial<NonNullable<SharingSettings['intercept']>>) => void
  updatePublicResultsSettings: (updates: Partial<NonNullable<SharingSettings['publicResults']>>) => void

  // Meta Actions
  loadFromApi: (data: { meta: Partial<StudyMeta>; studyId: string }) => void
  loadFromStudy: (study: LoadFromStudyInput) => void
  setSaveStatus: (status: SaveStatus) => void
  markSaved: () => void
  markSavedWithData: (data: { meta: StudyMeta }) => void
  setHydrated: (hydrated: boolean) => void
  reset: () => void
}

// Selector to compute isDirty from snapshot comparison
export const selectMetaIsDirty = (state: StudyMetaState): boolean => {
  // If no snapshot exists, assume dirty (data hasn't been saved yet)
  if (!state._snapshot) return true
  return !deepEqual(state.meta, state._snapshot.meta)
}

const studyMetaStore = create<StudyMetaState>()(
  persist(
    (set, get) => ({
      meta: DEFAULT_STUDY_META,
      _snapshot: null,
      studyId: null,
      saveStatus: 'idle' as SaveStatus,
      lastSavedAt: null,
      isHydrated: false,

      // Details Tab Actions
      setTitle: (title) => set((state) => applyMetaPatch(state, { title })),
      setDescription: (description) => set((state) => applyMetaPatch(state, { description })),
      setPurpose: (purpose) => set((state) => applyMetaPatch(state, { purpose })),
      setParticipantRequirements: (participantRequirements) => set((state) => applyMetaPatch(state, { participantRequirements })),
      setFolderId: (folderId) => set((state) => applyMetaPatch(state, { folderId })),

      addFileAttachment: (file) =>
        set((state) => ({
          meta: {
            ...state.meta,
            fileAttachments: [...state.meta.fileAttachments, file],
          },
        })),

      removeFileAttachment: (fileId) =>
        set((state) => ({
          meta: {
            ...state.meta,
            fileAttachments: state.meta.fileAttachments.filter(
              (f) => f.id !== fileId
            ),
          },
        })),

      setFileAttachments: (files) => set((state) => applyMetaPatch(state, { fileAttachments: files })),

      // Settings Tab Actions
      setUrlSlug: (urlSlug) => set((state) => applyMetaPatch(state, { urlSlug })),
      setLanguage: (language) => set((state) => applyMetaPatch(state, { language })),
      setPassword: (password) => set((state) => applyMetaPatch(state, { password })),

      // Session Recording Actions
      setSessionRecordingSettings: (sessionRecordingSettings) => set((state) => applyMetaPatch(state, { sessionRecordingSettings })),

      updateSessionRecordingSettings: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            sessionRecordingSettings: { ...state.meta.sessionRecordingSettings, ...updates },
          },
        })),

      setClosingRule: (closingRule) => set((state) => applyMetaPatch(state, { closingRule })),

      updateClosingRule: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            closingRule: { ...state.meta.closingRule, ...updates },
          },
        })),

      // Response Prevention Actions
      setResponsePrevention: (responsePrevention) => set((state) => applyMetaPatch(state, { responsePrevention })),

      updateResponsePrevention: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            responsePrevention: { ...state.meta.responsePrevention, ...updates },
          },
        })),

      // Email Notification Actions
      setNotificationSettings: (notificationSettings) => set((state) => applyMetaPatch(state, { notificationSettings })),

      updateNotificationSettings: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            notificationSettings: { ...state.meta.notificationSettings, ...updates },
          },
        })),

      toggleNotificationTrigger: (trigger, value) =>
        set((state) => {
          const triggers = state.meta.notificationSettings.triggers
          if (trigger === 'milestones') {
            return {
              meta: {
                ...state.meta,
                notificationSettings: {
                  ...state.meta.notificationSettings,
                  triggers: {
                    ...triggers,
                    milestones: { ...triggers.milestones, enabled: value },
                  },
                },
              },
            }
          }
          return {
            meta: {
              ...state.meta,
              notificationSettings: {
                ...state.meta.notificationSettings,
                triggers: { ...triggers, [trigger]: value },
              },
            },
          }
        }),

      toggleMilestone: (milestone) =>
        set((state) => {
          const milestones = state.meta.notificationSettings.triggers.milestones
          const values = milestones.values.includes(milestone)
            ? milestones.values.filter((m) => m !== milestone)
            : [...milestones.values, milestone].sort((a, b) => a - b)
          return {
            meta: {
              ...state.meta,
              notificationSettings: {
                ...state.meta.notificationSettings,
                triggers: {
                  ...state.meta.notificationSettings.triggers,
                  milestones: { ...milestones, values },
                },
              },
            },
          }
        }),

      // Branding Tab Actions
      setBranding: (branding) => set((state) => applyMetaPatch(state, { branding })),

      updateBranding: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            branding: {
              ...state.meta.branding,
              ...updates,
              buttonText: {
                ...state.meta.branding.buttonText,
                ...(updates.buttonText || {}),
              },
            },
          },
        })),

      setLogo: (logo) => set((state) => applyBrandingPatch(state, { logo })),
      setLogoSize: (logoSize) => set((state) => applyBrandingPatch(state, { logoSize })),

      removeLogo: () =>
        set((state) => {
          const { logo, ...rest } = state.meta.branding
          return {
            meta: { ...state.meta, branding: rest },
          }
        }),

      setSocialImage: (socialImage) => set((state) => applyBrandingPatch(state, { socialImage })),

      removeSocialImage: () =>
        set((state) => {
          const { socialImage, ...rest } = state.meta.branding
          return {
            meta: { ...state.meta, branding: rest },
          }
        }),

      setPrimaryColor: (color) => set((state) => applyBrandingPatch(state, { primaryColor: color })),

      setButtonText: (key, text) =>
        set((state) => ({
          meta: {
            ...state.meta,
            branding: {
              ...state.meta.branding,
              buttonText: {
                ...state.meta.branding.buttonText,
                [key]: text,
              },
            },
          },
        })),

      setCardSortInstructions: (instructions) => set((state) => applyBrandingPatch(state, { cardSortInstructions: instructions })),

      // Style customization actions
      setStylePreset: (stylePreset) => set((state) => applyBrandingPatch(state, { stylePreset })),
      setRadiusOption: (radiusOption) => set((state) => applyBrandingPatch(state, { radiusOption })),
      setThemeMode: (themeMode) => set((state) => applyBrandingPatch(state, { themeMode })),

      // Sharing Tab Actions
      setSharingSettings: (sharingSettings) => set((state) => applyMetaPatch(state, { sharingSettings })),

      updateSharingSettings: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            sharingSettings: {
              ...state.meta.sharingSettings,
              ...updates,
            },
          },
        })),

      updateRedirectSettings: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            sharingSettings: {
              ...state.meta.sharingSettings,
              redirects: {
                ...state.meta.sharingSettings.redirects,
                ...updates,
              },
            },
          },
        })),

      updateInterceptSettings: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            sharingSettings: {
              ...state.meta.sharingSettings,
              intercept: {
                ...state.meta.sharingSettings.intercept,
                ...updates,
              } as SharingSettings['intercept'],
            },
          },
        })),

      updatePublicResultsSettings: (updates) =>
        set((state) => ({
          meta: {
            ...state.meta,
            sharingSettings: {
              ...state.meta.sharingSettings,
              publicResults: {
                ...state.meta.sharingSettings.publicResults,
                ...updates,
              } as SharingSettings['publicResults'],
            },
          },
        })),

      // Meta Actions
      loadFromApi: (data) => {
        const meta = { ...DEFAULT_STUDY_META, ...data.meta }
        set({
          meta,
          _snapshot: createSnapshot({ meta }),
          studyId: data.studyId,
          saveStatus: 'idle',
          lastSavedAt: Date.now(),
        })
      },

      loadFromStudy: (study) => {
        const meta = mapStudyToMeta(study)
        set({
          meta,
          _snapshot: createSnapshot({ meta }),
          studyId: study.id,
          saveStatus: 'idle',
          lastSavedAt: Date.now(),
        })
      },

      setSaveStatus: (saveStatus) => set({ saveStatus }),

      markSaved: () => {
        const state = get()
        set({
          _snapshot: createSnapshot({ meta: state.meta }),
          saveStatus: 'saved',
          lastSavedAt: Date.now(),
        })
      },

      // Race-condition-safe: mark saved with the EXACT data that was sent to the API
      // This prevents "Saved" from appearing for edits made during save
      markSavedWithData: (data) => {
        set({
          _snapshot: createSnapshot(data),
          saveStatus: 'saved',
          lastSavedAt: Date.now(),
        })
      },

      setHydrated: (isHydrated) => set({ isHydrated }),

      reset: () =>
        set({
          meta: DEFAULT_STUDY_META,
          _snapshot: null,
          studyId: null,
          saveStatus: 'idle',
          lastSavedAt: null,
          isHydrated: false,
        }),
    }),
    {
      name: 'study-meta',
      partialize: (state) => ({
        meta: state.meta,
        studyId: state.studyId,
        _snapshot: state._snapshot,
        lastSavedAt: state.lastSavedAt,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state, error) => {
        // Always mark as hydrated, even if state is undefined (no localStorage data)
        // This handles the case of new studies with no cached data
        if (state) {
          state.isHydrated = true
        } else {
          // No persisted state - manually set hydrated via setState
          studyMetaStore.setState({ isHydrated: true })
        }
      },
    }
  )
)

// Trigger hydration once at module load (client-side only)
// This must happen outside of React's render cycle to avoid setState-during-render errors
if (typeof window !== 'undefined') {
  studyMetaStore.persist.rehydrate()
}

// Export the store directly - hydration happens at module load
export const useStudyMetaStore = studyMetaStore

// Hook to get computed isDirty state
export const useMetaIsDirty = () => useStudyMetaStore(selectMetaIsDirty)
