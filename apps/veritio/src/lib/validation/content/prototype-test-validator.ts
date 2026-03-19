import type { PrototypeTestPrototype, PrototypeTestTask } from '@veritio/study-types'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, truncateText } from '../utils'
import { castJsonArray } from '../../supabase/json-utils'
import { hasValidPathway } from './pathway-utils'

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

function validatePrototypeTasks(tasks: PrototypeTestTask[]): ValidationIssue[] {
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
  tasks: PrototypeTestTask[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  issues.push(...validatePrototype(prototype))
  issues.push(...validatePrototypeTasks(tasks))

  return issues
}
