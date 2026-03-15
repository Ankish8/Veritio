import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ROLE_LEVELS, type OrganizationRole } from '@/lib/supabase/collaboration-types'

/**
 * Collaboration store - manages organization context and collaboration UI state.
 *
 * This store handles:
 * - Current organization selection (for org switcher)
 * - Organization context for API calls
 * - Member/invitation management UI state
 *
 * Note: Actual data fetching is handled by SWR hooks (useOrganizations, useMembers, etc.)
 * This store only manages client-side state and organization selection.
 */

interface OrganizationSummary {
  id: string
  name: string
  slug: string
  is_personal: boolean
  user_role: OrganizationRole
}

interface CollaborationState {
  // Current organization context
  currentOrganizationId: string | null
  currentOrganization: OrganizationSummary | null

  // UI state
  isOrgSwitcherOpen: boolean
  isMemberPanelOpen: boolean
  isInviteDialogOpen: boolean
  isShareDialogOpen: boolean

  // Selected items for batch operations
  selectedMemberIds: string[]
  selectedInvitationIds: string[]

  // Hydration state
  isHydrated: boolean

  // Actions - Organization
  setCurrentOrganization: (org: OrganizationSummary | null) => void
  setCurrentOrganizationId: (id: string | null) => void

  // Actions - UI toggles
  setOrgSwitcherOpen: (open: boolean) => void
  toggleOrgSwitcher: () => void
  setMemberPanelOpen: (open: boolean) => void
  toggleMemberPanel: () => void
  setInviteDialogOpen: (open: boolean) => void
  setShareDialogOpen: (open: boolean) => void

  // Actions - Selection
  selectMember: (memberId: string) => void
  deselectMember: (memberId: string) => void
  toggleMemberSelection: (memberId: string) => void
  selectAllMembers: (memberIds: string[]) => void
  clearMemberSelection: () => void
  selectInvitation: (invitationId: string) => void
  deselectInvitation: (invitationId: string) => void
  toggleInvitationSelection: (invitationId: string) => void
  clearInvitationSelection: () => void

  // Actions - Meta
  setHydrated: (hydrated: boolean) => void
  reset: () => void
}

const collaborationStore = create<CollaborationState>()(
  persist(
    (set) => ({
      // Initial state
      currentOrganizationId: null,
      currentOrganization: null,
      isOrgSwitcherOpen: false,
      isMemberPanelOpen: false,
      isInviteDialogOpen: false,
      isShareDialogOpen: false,
      selectedMemberIds: [],
      selectedInvitationIds: [],
      isHydrated: false,

      // Actions - Organization
      setCurrentOrganization: (org) => {
        const id = org?.id ?? null
        // Sync to cookie so server components (getPanelContext) know the active org
        if (typeof document !== 'undefined') {
          if (id) {
            document.cookie = `veritio-active-org=${id};path=/;max-age=31536000;SameSite=Lax`
          } else {
            document.cookie = 'veritio-active-org=;path=/;max-age=0'
          }
        }
        set({
          currentOrganization: org,
          currentOrganizationId: id,
        })
      },

      setCurrentOrganizationId: (id) => {
        if (typeof document !== 'undefined') {
          if (id) {
            document.cookie = `veritio-active-org=${id};path=/;max-age=31536000;SameSite=Lax`
          } else {
            document.cookie = 'veritio-active-org=;path=/;max-age=0'
          }
        }
        set({ currentOrganizationId: id })
      },

      // Actions - UI toggles
      setOrgSwitcherOpen: (open) => set({ isOrgSwitcherOpen: open }),

      toggleOrgSwitcher: () =>
        set((state) => ({ isOrgSwitcherOpen: !state.isOrgSwitcherOpen })),

      setMemberPanelOpen: (open) => set({ isMemberPanelOpen: open }),

      toggleMemberPanel: () =>
        set((state) => ({ isMemberPanelOpen: !state.isMemberPanelOpen })),

      setInviteDialogOpen: (open) => set({ isInviteDialogOpen: open }),

      setShareDialogOpen: (open) => set({ isShareDialogOpen: open }),

      // Actions - Member selection
      selectMember: (memberId) =>
        set((state) => ({
          selectedMemberIds: state.selectedMemberIds.includes(memberId)
            ? state.selectedMemberIds
            : [...state.selectedMemberIds, memberId],
        })),

      deselectMember: (memberId) =>
        set((state) => ({
          selectedMemberIds: state.selectedMemberIds.filter((id) => id !== memberId),
        })),

      toggleMemberSelection: (memberId) =>
        set((state) => ({
          selectedMemberIds: state.selectedMemberIds.includes(memberId)
            ? state.selectedMemberIds.filter((id) => id !== memberId)
            : [...state.selectedMemberIds, memberId],
        })),

      selectAllMembers: (memberIds) =>
        set({ selectedMemberIds: memberIds }),

      clearMemberSelection: () =>
        set({ selectedMemberIds: [] }),

      // Actions - Invitation selection
      selectInvitation: (invitationId) =>
        set((state) => ({
          selectedInvitationIds: state.selectedInvitationIds.includes(invitationId)
            ? state.selectedInvitationIds
            : [...state.selectedInvitationIds, invitationId],
        })),

      deselectInvitation: (invitationId) =>
        set((state) => ({
          selectedInvitationIds: state.selectedInvitationIds.filter(
            (id) => id !== invitationId
          ),
        })),

      toggleInvitationSelection: (invitationId) =>
        set((state) => ({
          selectedInvitationIds: state.selectedInvitationIds.includes(invitationId)
            ? state.selectedInvitationIds.filter((id) => id !== invitationId)
            : [...state.selectedInvitationIds, invitationId],
        })),

      clearInvitationSelection: () =>
        set({ selectedInvitationIds: [] }),

      // Actions - Meta
      setHydrated: (isHydrated) => set({ isHydrated }),

      reset: () =>
        set({
          currentOrganizationId: null,
          currentOrganization: null,
          isOrgSwitcherOpen: false,
          isMemberPanelOpen: false,
          isInviteDialogOpen: false,
          isShareDialogOpen: false,
          selectedMemberIds: [],
          selectedInvitationIds: [],
        }),
    }),
    {
      name: 'collaboration',
      partialize: (state) => ({
        // Only persist organization selection
        currentOrganizationId: state.currentOrganizationId,
        currentOrganization: state.currentOrganization,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true
          // Sync persisted org ID to cookie on hydration so server components
          // pick it up even if the user never switches orgs this session.
          if (typeof document !== 'undefined' && state.currentOrganizationId) {
            document.cookie = `veritio-active-org=${state.currentOrganizationId};path=/;max-age=31536000;SameSite=Lax`
          }
        } else {
          collaborationStore.setState({ isHydrated: true })
        }
      },
    }
  )
)

// Trigger hydration once at module load (client-side only)
if (typeof window !== 'undefined') {
  collaborationStore.persist.rehydrate()
}

export const useCollaborationStore = collaborationStore

// Selector hooks for specific state slices
export const useCurrentOrganization = () =>
  useCollaborationStore((state) => state.isHydrated ? state.currentOrganization : null)

export const useCurrentOrganizationId = () =>
  useCollaborationStore((state) => state.isHydrated ? state.currentOrganizationId : null)

export const useIsOrgSwitcherOpen = () =>
  useCollaborationStore((state) => state.isOrgSwitcherOpen)

export const useSelectedMemberIds = () =>
  useCollaborationStore((state) => state.selectedMemberIds)

// Check if user has at least the required role in current org
export const useHasOrgRole = (requiredRole: OrganizationRole) => {
  const org = useCollaborationStore((state) => state.currentOrganization)
  if (!org) return false

  return ROLE_LEVELS[org.user_role] >= ROLE_LEVELS[requiredRole]
}
