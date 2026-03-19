import type { TreeNode, Task } from '@veritio/study-types'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, truncateText } from '../utils'
import { castJsonArray } from '../../supabase/json-utils'

function validateTreeNodes(nodes: TreeNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'tree',
  }

  if (nodes.length === 0) {
    issues.push(
      createIssue(
        'tree_test_content',
        'At least one tree node is required',
        navPath,
        { rule: 'min-nodes' }
      )
    )
    return issues
  }

  const emptyNodes = nodes.filter(n => !n.label || n.label.trim().length === 0)
  if (emptyNodes.length > 0) {
    for (const node of emptyNodes) {
      issues.push(
        createIssue(
          'tree_test_content',
          `A tree node is missing a label`,
          { ...navPath, nodeId: node.id },
          { itemId: node.id, rule: 'empty-node-label' }
        )
      )
    }
  }

  return issues
}

function validateTasks(tasks: Task[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'tasks',
  }

  if (tasks.length === 0) {
    issues.push(
      createIssue(
        'tree_test_content',
        'At least one task is required',
        navPath,
        { rule: 'min-tasks' }
      )
    )
    return issues
  }

  const emptyTasks = tasks.filter(t => !t.question || t.question.trim().length === 0)
  if (emptyTasks.length > 0) {
    for (const task of emptyTasks) {
      issues.push(
        createIssue(
          'tree_test_content',
          `Task is missing a question`,
          { ...navPath, taskId: task.id },
          { itemId: task.id, rule: 'empty-task-question' }
        )
      )
    }
  }

  const tasksWithoutAnswer = tasks.filter(t => {
    const ids = castJsonArray<string>(t.correct_node_ids)
    return ids.length === 0
  })
  for (const task of tasksWithoutAnswer) {
    const taskLabel = truncateText(task.question, 30)
    issues.push(
      createIssue(
        'tree_test_content',
        `Task "${taskLabel}" has no correct answer`,
        { ...navPath, taskId: task.id },
        { itemId: task.id, itemLabel: taskLabel, rule: 'no-correct-answer' }
      )
    )
  }

  return issues
}

export function validateTreeTestContent(
  nodes: TreeNode[],
  tasks: Task[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  issues.push(...validateTreeNodes(nodes))
  issues.push(...validateTasks(tasks))

  return issues
}
