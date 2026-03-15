import { EyeOff } from 'lucide-react'
import type { StatusFilterConfig } from './types'

/**
 * Standard status filter type (Card Sort, Survey)
 */
export type StandardStatusFilter = 'all' | 'included' | 'completed' | 'abandoned' | 'in_progress' | 'excluded'

/**
 * Standard status filter config used by Card Sort and Survey
 */
export const standardStatusFilterConfig: StatusFilterConfig<StandardStatusFilter> = {
  defaultValue: 'included',
  options: [
    {
      value: 'included',
      label: 'All included participants',
    },
    {
      value: 'all',
      label: 'All participants',
    },
    {
      value: 'completed',
      label: 'Completed',
      separatorBefore: true,
      getCount: (participants) => participants.filter((p) => p.status === 'completed').length,
    },
    {
      value: 'abandoned',
      label: 'Abandoned',
      getCount: (participants) => participants.filter((p) => p.status === 'abandoned').length,
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      getCount: (participants) => participants.filter((p) => p.status === 'in_progress').length,
    },
    {
      value: 'excluded',
      label: 'Excluded',
      icon: EyeOff,
      separatorBefore: true,
    },
  ],
}

/**
 * Tree Test status filter type (includes activity-based filters)
 */
export type TreeTestStatusFilter =
  | 'all'
  | 'included'
  | 'completed'
  | 'abandoned'
  | 'in_progress'
  | 'excluded'
  | 'with_responses'
  | 'no_responses'

/**
 * Tree Test status filter config with activity-based options
 *
 * Requires `extraData` to be { participantsWithResponses: Set<string> }
 */
export const treeTestStatusFilterConfig: StatusFilterConfig<TreeTestStatusFilter> = {
  defaultValue: 'included',
  options: [
    {
      value: 'included',
      label: 'All included participants',
    },
    {
      value: 'all',
      label: 'All participants',
      getCount: (participants) => participants.length,
    },
    {
      value: 'with_responses',
      label: 'Has activity',
      separatorBefore: true,
      getCount: (participants, extraData) => {
        const data = extraData as { participantsWithResponses?: Set<string> } | undefined
        if (!data?.participantsWithResponses) return 0
        return participants.filter((p) => data.participantsWithResponses!.has(p.id)).length
      },
    },
    {
      value: 'no_responses',
      label: 'No activity',
      getCount: (participants, extraData) => {
        const data = extraData as { participantsWithResponses?: Set<string> } | undefined
        if (!data?.participantsWithResponses) return participants.length
        return participants.filter((p) => !data.participantsWithResponses!.has(p.id)).length
      },
    },
    {
      value: 'completed',
      label: 'Completed',
      separatorBefore: true,
      getCount: (participants) => participants.filter((p) => p.status === 'completed').length,
    },
    {
      value: 'abandoned',
      label: 'Abandoned',
      getCount: (participants) => participants.filter((p) => p.status === 'abandoned').length,
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      getCount: (participants) => participants.filter((p) => p.status === 'in_progress').length,
    },
    {
      value: 'excluded',
      label: 'Excluded',
      icon: EyeOff,
      separatorBefore: true,
    },
  ],
}

/**
 * Prototype Test status filter type
 */
export type PrototypeTestStatusFilter = 'all' | 'included' | 'completed' | 'abandoned' | 'in_progress' | 'excluded'

/**
 * Prototype Test status filter config
 */
export const prototypeTestStatusFilterConfig: StatusFilterConfig<PrototypeTestStatusFilter> = {
  defaultValue: 'included',
  options: [
    {
      value: 'included',
      label: 'All included participants',
    },
    {
      value: 'all',
      label: 'All statuses',
      getCount: (participants) => participants.length,
    },
    {
      value: 'completed',
      label: 'Completed',
      separatorBefore: true,
      getCount: (participants) => participants.filter((p) => p.status === 'completed').length,
    },
    {
      value: 'abandoned',
      label: 'Abandoned',
      getCount: (participants) => participants.filter((p) => p.status === 'abandoned').length,
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      getCount: (participants) => participants.filter((p) => p.status === 'in_progress').length,
    },
    {
      value: 'excluded',
      label: 'Excluded',
      icon: EyeOff,
      separatorBefore: true,
    },
  ],
}

/**
 * First Impression status filter type (uses standard filter)
 */
export type FirstImpressionStatusFilter = StandardStatusFilter

/**
 * First Impression status filter config
 * Uses the same options as the standard filter (Card Sort, Survey)
 */
export const firstImpressionStatusFilterConfig: StatusFilterConfig<FirstImpressionStatusFilter> =
  standardStatusFilterConfig

/**
 * Live Website Test status filter type
 */
export type LiveWebsiteStatusFilter = 'all' | 'included' | 'completed' | 'abandoned' | 'in_progress' | 'excluded'

/**
 * Live Website Test status filter config
 */
export const liveWebsiteStatusFilterConfig: StatusFilterConfig<LiveWebsiteStatusFilter> = {
  defaultValue: 'included',
  options: [
    {
      value: 'included',
      label: 'All included participants',
    },
    {
      value: 'all',
      label: 'All statuses',
      getCount: (participants) => participants.length,
    },
    {
      value: 'completed',
      label: 'Completed',
      separatorBefore: true,
      getCount: (participants) => participants.filter((p) => p.status === 'completed').length,
    },
    {
      value: 'abandoned',
      label: 'Abandoned',
      getCount: (participants) => participants.filter((p) => p.status === 'abandoned').length,
    },
    {
      value: 'in_progress',
      label: 'In Progress',
      getCount: (participants) => participants.filter((p) => p.status === 'in_progress').length,
    },
    {
      value: 'excluded',
      label: 'Excluded',
      icon: EyeOff,
      separatorBefore: true,
    },
  ],
}
