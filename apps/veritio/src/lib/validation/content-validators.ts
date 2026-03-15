import type {
  CardWithImage,
  Category,
  TreeNode,
  Task,
  CardSortSettings,
  PrototypeTestPrototype,
  PrototypeTestTask,
} from '@veritio/study-types'
import type { FirstClickTaskWithDetails } from '../../stores/study-builder/first-click-builder'
import type { StudyFlowQuestion, SurveyCustomSection, FirstImpressionDesign } from '../supabase/study-flow-types'
import type { LiveWebsiteTask, LiveWebsiteSettings } from '../../stores/study-builder/live-website-builder'
import type { ValidationIssue, ValidationNavigationPath } from './types'
import { createIssue, truncateText, findDuplicateLabels, isHtmlEmpty } from './utils'
import { castJsonArray } from '../supabase/json-utils'

function validateCards(cards: CardWithImage[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'content',
  }

  if (cards.length === 0) {
    issues.push(
      createIssue(
        'card_sort_content',
        'At least one card is required',
        navPath,
        { rule: 'min-cards' }
      )
    )
    return issues
  }

  const emptyCards = cards.filter(c => !c.label || c.label.trim().length === 0)
  if (emptyCards.length > 0) {
    for (const card of emptyCards) {
      issues.push(
        createIssue(
          'card_sort_content',
          `A card is missing a label`,
          { ...navPath, itemId: card.id, itemType: 'card' },
          { itemId: card.id, rule: 'empty-card-label' }
        )
      )
    }
  }

  const duplicates = findDuplicateLabels(cards)
  for (const label of duplicates) {
    issues.push(
      createIssue(
        'card_sort_content',
        `Duplicate card label "${truncateText(label, 25)}"`,
        navPath,
        { rule: 'duplicate-card-label' }
      )
    )
  }

  return issues
}

function validateCategories(
  categories: Category[],
  mode: CardSortSettings['mode']
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'content',
  }

  if (mode === 'open') {
    return issues
  }

  if (categories.length === 0) {
    issues.push(
      createIssue(
        'card_sort_content',
        'At least one category is required for closed/hybrid mode',
        navPath,
        { rule: 'min-categories' }
      )
    )
    return issues
  }

  const emptyCategories = categories.filter(c => !c.label || c.label.trim().length === 0)
  if (emptyCategories.length > 0) {
    for (const category of emptyCategories) {
      issues.push(
        createIssue(
          'card_sort_content',
          `A category is missing a label`,
          { ...navPath, itemId: category.id, itemType: 'category' },
          { itemId: category.id, rule: 'empty-category-label' }
        )
      )
    }
  }

  const duplicates = findDuplicateLabels(categories)
  for (const label of duplicates) {
    issues.push(
      createIssue(
        'card_sort_content',
        `Duplicate category label "${truncateText(label, 25)}"`,
        navPath,
        { rule: 'duplicate-category-label' }
      )
    )
  }

  return issues
}

export function validateCardSortContent(
  cards: CardWithImage[],
  categories: Category[],
  settings: CardSortSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  issues.push(...validateCards(cards))
  issues.push(...validateCategories(categories, settings.mode))

  return issues
}

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

function validateCustomSections(
  sections: SurveyCustomSection[],
  surveyQuestions: StudyFlowQuestion[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'survey',
  }

  if (sections.length === 0) {
    return issues
  }

  const emptySections = sections.filter(s => !s.name || s.name.trim().length === 0)
  for (const section of emptySections) {
    issues.push(
      createIssue(
        'survey_content',
        'A section is missing a name',
        { ...navPath, questionId: section.id },
        { itemId: section.id, rule: 'empty-section-name' }
      )
    )
  }

  const sectionNames = sections.map(s => s.name.trim().toLowerCase())
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const name of sectionNames) {
    if (name && seen.has(name)) {
      duplicates.add(name)
    }
    seen.add(name)
  }
  for (const name of duplicates) {
    const originalSection = sections.find(s => s.name.trim().toLowerCase() === name)
    issues.push(
      createIssue(
        'survey_content',
        `Duplicate section name "${truncateText(originalSection?.name || name, 25)}"`,
        navPath,
        { rule: 'duplicate-section-name' }
      )
    )
  }

  for (const section of sections) {
    const questionsInSection = surveyQuestions.filter(q => q.custom_section_id === section.id)
    if (questionsInSection.length === 0) {
      issues.push(
        createIssue(
          'survey_content',
          `Section "${truncateText(section.name, 25)}" has no questions`,
          { ...navPath, questionId: section.id },
          { itemId: section.id, itemLabel: section.name, rule: 'empty-section' }
        )
      )
    }
  }

  return issues
}

export function validateSurveyContent(
  surveyQuestions: StudyFlowQuestion[],
  customSections?: SurveyCustomSection[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'survey',
  }

  if (surveyQuestions.length === 0) {
    issues.push(
      createIssue(
        'survey_content',
        'At least one survey question is required',
        navPath,
        { rule: 'min-survey-questions' }
      )
    )
    return issues
  }

  if (customSections && customSections.length > 0) {
    issues.push(...validateCustomSections(customSections, surveyQuestions))
  }

  return issues
}

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

function hasValidPathway(pathway: unknown): boolean {
  if (!pathway || typeof pathway !== 'object') return false

  // v3 format: { version: 3, paths: [{ steps: [...], frames: [...] }] }
  if ('version' in pathway && (pathway as { version: number }).version === 3) {
    const v3 = pathway as { paths?: unknown[] }
    return Array.isArray(v3.paths) && v3.paths.some((p) => {
      if (!p || typeof p !== 'object') return false
      // V3 paths have both steps and frames; check either
      const hasFrames = 'frames' in p &&
        Array.isArray((p as { frames: unknown[] }).frames) &&
        (p as { frames: unknown[] }).frames.length >= 2
      const hasSteps = 'steps' in p &&
        Array.isArray((p as { steps: unknown[] }).steps) &&
        (p as { steps: unknown[] }).steps.length >= 1
      return hasFrames || hasSteps
    })
  }

  // v2 format: { version: 2, paths: [...] }
  if ('version' in pathway && (pathway as { version: number }).version === 2) {
    const v2 = pathway as { paths?: unknown[] }
    return Array.isArray(v2.paths) && v2.paths.some(
      (p) => p && typeof p === 'object' && 'frames' in p &&
        Array.isArray((p as { frames: unknown[] }).frames) &&
        (p as { frames: unknown[] }).frames.length >= 2
    )
  }

  // v1 format: { frames: [...], strict: boolean }
  if ('frames' in pathway && Array.isArray((pathway as { frames: unknown[] }).frames)) {
    return (pathway as { frames: unknown[] }).frames.length >= 2
  }

  // Legacy array format
  if (Array.isArray(pathway)) {
    return pathway.length >= 2
  }

  return false
}

function validatePrototypeTasks(tasks: PrototypeTestTask[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Tab ID is 'prototype-tasks' (tree tests use 'tasks')
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

  for (const task of tasks) {
    const taskPosition = tasks.indexOf(task) + 1
    const taskLabel = task.instruction
      ? truncateText(task.instruction, 30)
      : `Task ${taskPosition}`

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

function validateFirstImpressionDesigns(designs: FirstImpressionDesign[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'first-impression-designs',
  }

  if (designs.length === 0) {
    issues.push(
      createIssue(
        'first_impression_content',
        'At least one design is required',
        navPath,
        { rule: 'min-first-impression-designs' }
      )
    )
    return issues
  }

  const nonPracticeDesigns = designs.filter(d => !d.is_practice)
  if (nonPracticeDesigns.length === 0) {
    issues.push(
      createIssue(
        'first_impression_content',
        'At least one non-practice design is required',
        navPath,
        { rule: 'no-test-designs' }
      )
    )
    return issues
  }

  for (const design of designs) {
    const designPosition = designs.indexOf(design) + 1
    const designLabel = design.name
      ? truncateText(design.name, 30)
      : `Design ${designPosition}`

    if (!design.image_url) {
      issues.push(
        createIssue(
          'first_impression_content',
          `${designLabel} is missing an image`,
          { ...navPath, taskId: design.id },
          { itemId: design.id, itemLabel: designLabel, rule: 'no-design-image' }
        )
      )
    }

    if (!design.questions || design.questions.length === 0) {
      issues.push(
        createIssue(
          'first_impression_content',
          `${designLabel} needs at least one question`,
          { ...navPath, taskId: design.id },
          { itemId: design.id, itemLabel: designLabel, rule: 'no-design-questions' }
        )
      )
    }
  }

  const namedDesigns = designs.filter(d => d.name && d.name.trim().length > 0)
  if (namedDesigns.length > 0) {
    const names = namedDesigns.map(d => d.name!.trim().toLowerCase())
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const name of names) {
      if (seen.has(name)) {
        duplicates.add(name)
      }
      seen.add(name)
    }
    for (const name of duplicates) {
      const originalDesign = namedDesigns.find(d => d.name!.trim().toLowerCase() === name)
      issues.push(
        createIssue(
          'first_impression_content',
          `Duplicate design name "${truncateText(originalDesign?.name || name, 25)}"`,
          navPath,
          { rule: 'duplicate-design-name' }
        )
      )
    }
  }

  return issues
}

export function validateFirstImpressionContent(
  designs: FirstImpressionDesign[]
): ValidationIssue[] {
  return validateFirstImpressionDesigns(designs)
}

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

  for (const task of tasks) {
    const taskPosition = tasks.indexOf(task) + 1
    const taskLabel = task.title
      ? truncateText(task.title, 30)
      : `Task ${taskPosition}`

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
