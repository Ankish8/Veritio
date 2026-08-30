import type {
  PrototypeTestPrototype,
  PrototypeTestTask,
  PrototypeTestFrame,
  SuccessPathway,
} from '@veritio/study-types'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, truncateText } from '../utils'
import { castJsonArray } from '../../supabase/json-utils'
import { hasValidPathway } from './pathway-utils'
import { getGoalFramesFromPathway } from '@veritio/prototype-test/algorithms/path-matching'

function validatePrototype(prototype: PrototypeTestPrototype | null): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'content',
  }

  if (!prototype) {
    issues.push(
      createIssue(
        'prototype_test_content',
        'A Figma prototype must be connected',
        navPath,
        { rule: 'prototype-required' }
      )
    )
  }

  return issues
}

/** Shape of `prototype_test_tasks.state_success_criteria` (component_state type). */
interface StateSuccessCriteria {
  states?: unknown[]
  logic?: 'AND' | 'OR'
}

function hasValidStateCriteria(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const states = (value as StateSuccessCriteria).states
  return Array.isArray(states) && states.length > 0
}

function validatePrototypeTasks(
  tasks: PrototypeTestTask[],
  frames: PrototypeTestFrame[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'prototype-tasks',
  }

  if (tasks.length === 0) {
    issues.push(
      createIssue(
        'prototype_test_content',
        'At least one task is required',
        navPath,
        { rule: 'min-prototype-tasks' }
      )
    )
    return issues
  }

  // Re-syncing a Figma file deletes frames that no longer exist in it.
  // `start_frame_id` is a real FK (ON DELETE SET NULL, caught below), but
  // `success_frame_ids` and `success_pathway` are JSONB with no referential
  // integrity — they silently keep pointing at deleted frames, leaving a task
  // that can never be completed. Only check when we actually know the frame
  // set; an empty list means frames have not loaded yet, not that all are gone.
  const knownFrameIds = new Set(frames.map((f) => f.id))
  const canCheckFrameRefs = knownFrameIds.size > 0

  for (const task of tasks) {
    const taskLabel = truncateText(task.title || 'Untitled task', 30)

    if (task.flow_type === 'free_flow') {
      continue
    }

    if (!task.start_frame_id) {
      issues.push(
        createIssue(
          'prototype_test_content',
          `Task "${taskLabel}" is missing a starting screen`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-start-frame' }
        )
      )
    } else if (canCheckFrameRefs && !knownFrameIds.has(task.start_frame_id)) {
      issues.push(
        createIssue(
          'prototype_test_content',
          `Task "${taskLabel}" starts on a screen that no longer exists in the Figma file`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'stale-start-frame' }
        )
      )
    }

    const successFrameIds = castJsonArray<string>(task.success_frame_ids)

    if (task.success_criteria_type === 'destination') {
      if (successFrameIds.length === 0) {
        issues.push(
          createIssue(
            'prototype_test_content',
            `Task "${taskLabel}" is missing a goal screen`,
            { ...navPath, taskId: task.id },
            { itemId: task.id, itemLabel: taskLabel, rule: 'no-success-criteria' }
          )
        )
      } else if (
        canCheckFrameRefs &&
        successFrameIds.every((id) => !knownFrameIds.has(id))
      ) {
        issues.push(
          createIssue(
            'prototype_test_content',
            `Task "${taskLabel}" has no goal screen left in the Figma file, so it can never be completed`,
            { ...navPath, taskId: task.id },
            { itemId: task.id, itemLabel: taskLabel, rule: 'stale-success-frames' }
          )
        )
      }
    } else if (task.success_criteria_type === 'pathway') {
      if (!hasValidPathway(task.success_pathway)) {
        issues.push(
          createIssue(
            'prototype_test_content',
            `Task "${taskLabel}" is missing a success path`,
            { ...navPath, taskId: task.id },
            { itemId: task.id, itemLabel: taskLabel, rule: 'no-success-pathway' }
          )
        )
      } else if (canCheckFrameRefs) {
        const goalFrames = getGoalFramesFromPathway(task.success_pathway as SuccessPathway)
        if (goalFrames.length > 0 && goalFrames.every((id) => !knownFrameIds.has(id))) {
          issues.push(
            createIssue(
              'prototype_test_content',
              `Task "${taskLabel}" has a success path ending on a screen that no longer exists in the Figma file`,
              { ...navPath, taskId: task.id },
              { itemId: task.id, itemLabel: taskLabel, rule: 'stale-success-pathway' }
            )
          )
        }
      }
    } else if (task.success_criteria_type === 'component_state') {
      // Previously fell through to the catch-all below, so any study using
      // component-state success criteria — which the player and the DB's
      // valid_success_criteria constraint both support — could never be
      // launched.
      if (!hasValidStateCriteria((task as { state_success_criteria?: unknown }).state_success_criteria)) {
        issues.push(
          createIssue(
            'prototype_test_content',
            `Task "${taskLabel}" is missing the component states that count as success`,
            { ...navPath, taskId: task.id },
            { itemId: task.id, itemLabel: taskLabel, rule: 'no-success-component-states' }
          )
        )
      }
    } else {
      issues.push(
        createIssue(
          'prototype_test_content',
          `Task "${taskLabel}" needs success criteria configured`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-success-criteria-type' }
        )
      )
    }
  }

  return issues
}

export function validatePrototypeTestContent(
  prototype: PrototypeTestPrototype | null,
  tasks: PrototypeTestTask[],
  frames: PrototypeTestFrame[] = []
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  issues.push(...validatePrototype(prototype))
  issues.push(...validatePrototypeTasks(tasks, frames))

  return issues
}
