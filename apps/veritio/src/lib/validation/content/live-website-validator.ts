import type { LiveWebsiteTask, LiveWebsiteSettings } from '../../../stores/study-builder/live-website-builder'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, isHtmlEmpty } from '../utils'
import { getTaskLabel } from './task-label-utils'

export function validateLiveWebsiteContent(
  tasks: LiveWebsiteTask[],
  settings: LiveWebsiteSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const tasksNavPath: ValidationNavigationPath = { tab: 'live-website-tasks' }
  const setupNavPath: ValidationNavigationPath = { tab: 'live-website-setup' }

  if (!settings.websiteUrl || settings.websiteUrl.trim().length === 0) {
    issues.push(
      createIssue(
        'live_website_content',
        'Website URL is required',
        setupNavPath,
        { rule: 'no-website-url' }
      )
    )
  }

  if (tasks.length === 0) {
    issues.push(
      createIssue(
        'live_website_content',
        'At least one task is required',
        tasksNavPath,
        { rule: 'min-live-website-tasks' }
      )
    )
    return issues
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const taskPosition = i + 1
    const taskLabel = getTaskLabel(task.title, taskPosition)

    if (!task.title || task.title.trim().length === 0) {
      issues.push(
        createIssue(
          'live_website_content',
          `Task ${taskPosition} is missing a title`,
          { ...tasksNavPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-task-title' }
        )
      )
    }

    if (!task.instructions || isHtmlEmpty(task.instructions)) {
      issues.push(
        createIssue(
          'live_website_content',
          `${taskLabel} is missing instructions`,
          { ...tasksNavPath, taskId: task.id },
          { itemId: task.id, itemLabel: taskLabel, rule: 'no-task-instructions' }
        )
      )
    }

    if (task.success_criteria_type === 'url_match') {
      if (!task.success_url || task.success_url.trim().length === 0) {
        issues.push(
          createIssue(
            'live_website_content',
            `${taskLabel} needs a success URL for URL-match detection`,
            { ...tasksNavPath, taskId: task.id },
            { itemId: task.id, itemLabel: taskLabel, rule: 'no-success-url' }
          )
        )
      }
      if (settings.mode === 'url_only') {
        issues.push(
          createIssue(
            'live_website_content',
            `${taskLabel} uses URL matching but tracking mode is "Observer Mode" — switch to Auto Mode or Snippet Mode in the Website tab`,
            setupNavPath,
            { rule: 'incompatible-mode-url-match' }
          )
        )
      }
    }

    if (task.success_criteria_type === 'exact_path') {
      if (!task.success_path || task.success_path.steps.length === 0) {
        issues.push(
          createIssue(
            'live_website_content',
            `${taskLabel} needs an exact path recorded`,
            { ...tasksNavPath, taskId: task.id },
            { itemId: task.id, itemLabel: taskLabel, rule: 'no-exact-path' }
          )
        )
      }
      if (settings.mode === 'url_only') {
        issues.push(
          createIssue(
            'live_website_content',
            `${taskLabel} uses exact path but tracking mode is "Observer Mode" — switch to Auto Mode or Snippet Mode in the Website tab`,
            setupNavPath,
            { rule: 'incompatible-mode-exact-path' }
          )
        )
      }
    }
  }

  return issues
}
