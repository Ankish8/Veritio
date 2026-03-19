import type { FirstClickTaskWithDetails } from '../../../stores/study-builder/first-click-builder'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue } from '../utils'
import { getTaskLabel } from './task-label-utils'

function validateFirstClickTasks(tasks: FirstClickTaskWithDetails[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'first-click-tasks',
  }

  if (tasks.length === 0) {
    issues.push(
      createIssue(
        'first_click_content',
        'At least one task is required',
        navPath,
        { rule: 'min-first-click-tasks' }
      )
    )
    return issues
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const taskPosition = i + 1
    const taskLabel = getTaskLabel(task.instruction, taskPosition)

    if (!task.instruction || task.instruction.trim().length === 0) {
      issues.push(
        createIssue(
          'first_click_content',
          `Task ${taskPosition} is missing an instruction`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-task-instruction' }
        )
      )
    }

    if (!task.image) {
      issues.push(
        createIssue(
          'first_click_content',
          `Task ${taskPosition} is missing an image`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-task-image' }
        )
      )
    }

    if (!task.aois || task.aois.length === 0) {
      issues.push(
        createIssue(
          'first_click_content',
          `Task ${taskPosition} has no correct areas defined`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-correct-areas' }
        )
      )
    }
  }

  return issues
}

export function validateFirstClickContent(
  tasks: FirstClickTaskWithDetails[]
): ValidationIssue[] {
  return validateFirstClickTasks(tasks)
}
