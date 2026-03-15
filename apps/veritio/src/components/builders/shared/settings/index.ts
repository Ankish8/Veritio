/**
 * Shared Settings Components
 *
 * Reusable components for builder settings panels.
 * These replace repeated patterns across Card Sort, Tree Test,
 * Prototype Test, and First-Click settings panels.
 *
 * @example
 * import {
 *   SettingToggle,
 *   SettingRadioGroup,
 *   SettingSelect,
 *   EmptyStateCard,
 *   useDeletionDialog,
 * } from '@/components/builders/shared/settings'
 */

// Setting field components
export { SettingToggle } from './setting-toggle'
export type { SettingToggleProps } from './setting-toggle'

export { SettingRadioGroup } from './setting-radio-group'
export type { SettingRadioGroupProps, SettingRadioOption } from './setting-radio-group'

export { SettingSelect } from './setting-select'
export type { SettingSelectProps, SettingSelectOption } from './setting-select'

// Empty state
export { EmptyStateCard } from './empty-state-card'
export type { EmptyStateCardProps } from './empty-state-card'

// Hooks
export { useDeletionDialog } from './hooks/use-deletion-dialog'
export type { UseDeletionDialogReturn } from './hooks/use-deletion-dialog'

// Note: SettingField is intentionally NOT exported - it's an internal implementation detail.
// Use SettingToggle, SettingRadioGroup, or SettingSelect instead.
