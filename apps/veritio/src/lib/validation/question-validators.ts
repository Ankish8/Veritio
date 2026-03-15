// =============================================================================
// QUESTION VALIDATORS
// Validation logic for each question type
// =============================================================================

import type {
  StudyFlowQuestion,
  FlowSection,
  TextQuestionConfig,
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  AudioResponseQuestionConfig,
  BranchingLogic,
  ChoiceOption,
  ABTestVariant,
} from '../supabase/study-flow-types'
import type { ValidationIssue, ValidationNavigationPath } from './types'
import { flowSectionToValidationSection, flowSectionToActiveSection } from './types'
import {
  createIssue,
  isHtmlEmpty,
  truncateText,
  getQuestionLabel,
  hasDuplicateLabels,
  findDuplicateLabels,
  findEmptyLabels,
} from './utils'

// -----------------------------------------------------------------------------
// Main Question Validator
// -----------------------------------------------------------------------------

/**
 * Validate a single question
 * @param abTest - Optional AB test for this question (if any)
 */
export function validateQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  precedingQuestions: StudyFlowQuestion[],
  abTest?: ABTestVariant | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)
  const _itemLabel = truncateText(question.question_text)

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: flowSectionToActiveSection(section),
    questionId: question.id,
  }

  // Check if AB test has question text - if so, validate that instead of base question
  const hasAbTestQuestionText = abTest?.is_enabled &&
    abTest.variant_a_content &&
    typeof abTest.variant_a_content === 'object' &&
    ('question_text' in abTest.variant_a_content || 'question_text_html' in abTest.variant_a_content)

  // Check question text is not empty (check AB test variant if present)
  if (!hasAbTestQuestionText) {
    if (isHtmlEmpty(question.question_text) && isHtmlEmpty(question.question_text_html)) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Question label is empty`,
          navPath,
          { itemId: question.id, rule: 'empty-label' }
        )
      )
    }
  } else {
    // Validate AB test variant A question text
    const variantA = abTest!.variant_a_content as unknown as Record<string, unknown>
    const variantAText = variantA.question_text as string | undefined
    const variantAHtml = variantA.question_text_html as string | undefined
    if (isHtmlEmpty(variantAText) && isHtmlEmpty(variantAHtml)) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Variant A question text is empty`,
          navPath,
          { itemId: question.id, rule: 'empty-label' }
        )
      )
    }
    // Validate AB test variant B question text
    const variantB = abTest!.variant_b_content as unknown as Record<string, unknown>
    const variantBText = variantB?.question_text as string | undefined
    const variantBHtml = variantB?.question_text_html as string | undefined
    if (isHtmlEmpty(variantBText) && isHtmlEmpty(variantBHtml)) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Variant B question text is empty`,
          navPath,
          { itemId: question.id, rule: 'empty-label' }
        )
      )
    }
  }

  // Check question is not still in default/unconfigured state
  // When a question is created, it defaults to "New question" text
  // This indicates the user hasn't finished configuring it
  if (!hasAbTestQuestionText && question.question_text === 'New question') {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Question needs to be configured`,
        navPath,
        { itemId: question.id, rule: 'unconfigured-question' }
      )
    )
  }

  // Type-specific validation
  switch (question.question_type) {
    case 'single_line_text':
    case 'multi_line_text':
      issues.push(...validateTextQuestion(question, section, position, navPath))
      break
    case 'multiple_choice':
      issues.push(...validateMultipleChoiceQuestion(question, section, position, navPath, abTest))
      break
    case 'opinion_scale':
      issues.push(...validateOpinionScaleQuestion(question, section, position, navPath))
      break
    case 'matrix':
      issues.push(...validateMatrixQuestion(question, section, position, navPath))
      break
    case 'ranking':
      issues.push(...validateRankingQuestion(question, section, position, navPath))
      break
    case 'audio_response':
      issues.push(...validateAudioResponseQuestion(question, section, position, navPath))
      break
    // yes_no and NPS have no additional validation needed
  }

  // Validate display logic if present
  if (question.display_logic) {
    issues.push(...validateDisplayLogic(question, section, position, precedingQuestions, navPath))
  }

  // Validate branching logic if present (screening only)
  if (question.branching_logic && section === 'screening') {
    issues.push(...validateBranchingLogic(question, section, position, navPath))
  }

  return issues
}

// -----------------------------------------------------------------------------
// Text Question Validators
// -----------------------------------------------------------------------------

function validateTextQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)
  const config = question.config as TextQuestionConfig

  // Check min/max length constraints
  if (
    config.minLength !== undefined &&
    config.maxLength !== undefined &&
    config.minLength > config.maxLength
  ) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Minimum length (${config.minLength}) cannot exceed maximum length (${config.maxLength})`,
        navPath,
        { itemId: question.id, rule: 'text-length-constraint' }
      )
    )
  }

  return issues
}

// -----------------------------------------------------------------------------
// Choice Question Validators (Radio, Dropdown, Checkbox)
// -----------------------------------------------------------------------------

function validateChoiceOptions(
  options: ChoiceOption[],
  sectionId: ReturnType<typeof flowSectionToValidationSection>,
  questionLabel: string,
  navPath: ValidationNavigationPath,
  questionId: string,
  minOptions: number = 2
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check minimum options
  if (options.length < minOptions) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: At least ${minOptions} options are required`,
        navPath,
        { itemId: questionId, rule: 'min-options' }
      )
    )
  }

  // Check for empty option labels
  const emptyLabels = findEmptyLabels(options)
  if (emptyLabels.length > 0) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: ${emptyLabels.length === 1 ? 'An option label is' : `${emptyLabels.length} option labels are`} empty`,
        navPath,
        { itemId: questionId, rule: 'empty-option-label' }
      )
    )
  }

  // Check for duplicate labels
  const duplicates = findDuplicateLabels(options)
  if (duplicates.length > 0) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Duplicate option "${truncateText(duplicates[0], 20)}"`,
        navPath,
        { itemId: questionId, rule: 'duplicate-option' }
      )
    )
  }

  return issues
}

function validateMultipleChoiceQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath,
  abTest?: ABTestVariant | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const config = question.config as MultipleChoiceQuestionConfig
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)

  // Check if AB test includes options
  const abTestIncludesOptions = abTest?.is_enabled &&
    abTest.variant_a_content &&
    typeof abTest.variant_a_content === 'object' &&
    'options' in abTest.variant_a_content

  // Validate options - either from AB test variants or from base config
  if (abTestIncludesOptions) {
    // Validate variant A options
    const variantA = abTest!.variant_a_content as unknown as Record<string, unknown>
    const variantAOptions = variantA.options as ChoiceOption[] | undefined
    issues.push(
      ...validateChoiceOptions(
        variantAOptions || [],
        sectionId,
        `${questionLabel} (Variant A)`,
        navPath,
        question.id
      )
    )
    // Validate variant B options
    const variantB = abTest!.variant_b_content as unknown as Record<string, unknown>
    const variantBOptions = variantB?.options as ChoiceOption[] | undefined
    issues.push(
      ...validateChoiceOptions(
        variantBOptions || [],
        sectionId,
        `${questionLabel} (Variant B)`,
        navPath,
        question.id
      )
    )
  } else {
    // No AB test with options - validate base config options
    issues.push(
      ...validateChoiceOptions(
        config.options || [],
        sectionId,
        questionLabel,
        navPath,
        question.id
      )
    )
  }

  // For multi-select mode, check selection constraints
  if (config.mode === 'multi') {
    const optionCount = config.options?.length || 0

    if (
      config.minSelections !== undefined &&
      config.maxSelections !== undefined &&
      config.minSelections > config.maxSelections
    ) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Minimum selections (${config.minSelections}) cannot exceed maximum (${config.maxSelections})`,
          navPath,
          { itemId: question.id, rule: 'selection-constraint' }
        )
      )
    }

    if (config.minSelections !== undefined && config.minSelections > optionCount) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Minimum selections (${config.minSelections}) exceeds available options (${optionCount})`,
          navPath,
          { itemId: question.id, rule: 'selection-exceeds-options' }
        )
      )
    }

    if (config.maxSelections !== undefined && config.maxSelections > optionCount) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Maximum selections (${config.maxSelections}) exceeds available options (${optionCount})`,
          navPath,
          { itemId: question.id, rule: 'max-exceeds-options' }
        )
      )
    }
  }

  return issues
}

// -----------------------------------------------------------------------------
// Opinion Scale Question Validator
// -----------------------------------------------------------------------------

function validateOpinionScaleQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const config = question.config as OpinionScaleQuestionConfig
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)

  // Check scale points are within valid range
  if (config.scalePoints < 2 || config.scalePoints > 11) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Scale points must be between 2 and 11`,
        navPath,
        { itemId: question.id, rule: 'opinion-scale-range' }
      )
    )
  }

  return issues
}

// -----------------------------------------------------------------------------
// Matrix Question Validator
// -----------------------------------------------------------------------------

function validateMatrixQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const config = question.config as MatrixQuestionConfig
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)

  // Check minimum rows
  if (!config.rows || config.rows.length < 1) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: At least 1 row is required`,
        navPath,
        { itemId: question.id, rule: 'matrix-min-rows' }
      )
    )
  }

  // Check minimum columns
  if (!config.columns || config.columns.length < 1) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: At least 1 column is required`,
        navPath,
        { itemId: question.id, rule: 'matrix-min-columns' }
      )
    )
  }

  // Check for empty row labels
  if (config.rows) {
    const emptyRows = findEmptyLabels(config.rows)
    if (emptyRows.length > 0) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: ${emptyRows.length === 1 ? 'A row label is' : `${emptyRows.length} row labels are`} empty`,
          navPath,
          { itemId: question.id, rule: 'matrix-empty-row' }
        )
      )
    }

    // Check for duplicate row labels
    if (hasDuplicateLabels(config.rows)) {
      const duplicates = findDuplicateLabels(config.rows)
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Duplicate row "${truncateText(duplicates[0], 20)}"`,
          navPath,
          { itemId: question.id, rule: 'matrix-duplicate-row' }
        )
      )
    }
  }

  // Check for empty column labels
  if (config.columns) {
    const emptyCols = findEmptyLabels(config.columns)
    if (emptyCols.length > 0) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: ${emptyCols.length === 1 ? 'A column label is' : `${emptyCols.length} column labels are`} empty`,
          navPath,
          { itemId: question.id, rule: 'matrix-empty-column' }
        )
      )
    }

    // Check for duplicate column labels
    if (hasDuplicateLabels(config.columns)) {
      const duplicates = findDuplicateLabels(config.columns)
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Duplicate column "${truncateText(duplicates[0], 20)}"`,
          navPath,
          { itemId: question.id, rule: 'matrix-duplicate-column' }
        )
      )
    }
  }

  return issues
}

// -----------------------------------------------------------------------------
// Ranking Question Validator
// -----------------------------------------------------------------------------

function validateRankingQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const config = question.config as RankingQuestionConfig
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)

  // Check minimum items
  if (!config.items || config.items.length < 2) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: At least 2 items are required for ranking`,
        navPath,
        { itemId: question.id, rule: 'ranking-min-items' }
      )
    )
  }

  if (config.items) {
    // Check for empty labels
    const emptyItems = findEmptyLabels(config.items)
    if (emptyItems.length > 0) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: ${emptyItems.length === 1 ? 'An item label is' : `${emptyItems.length} item labels are`} empty`,
          navPath,
          { itemId: question.id, rule: 'ranking-empty-item' }
        )
      )
    }

    // Check for duplicate labels
    if (hasDuplicateLabels(config.items)) {
      const duplicates = findDuplicateLabels(config.items)
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Duplicate item "${truncateText(duplicates[0], 20)}"`,
          navPath,
          { itemId: question.id, rule: 'ranking-duplicate-item' }
        )
      )
    }
  }

  return issues
}

// -----------------------------------------------------------------------------
// Audio Response Question Validator
// -----------------------------------------------------------------------------

function validateAudioResponseQuestion(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const config = question.config as AudioResponseQuestionConfig
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)

  // Check max duration is within valid range (30-300 seconds)
  if (config.maxDurationSeconds < 30) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Maximum duration must be at least 30 seconds`,
        navPath,
        { itemId: question.id, rule: 'audio-min-max-duration' }
      )
    )
  }

  if (config.maxDurationSeconds > 300) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Maximum duration cannot exceed 5 minutes (300 seconds)`,
        navPath,
        { itemId: question.id, rule: 'audio-max-duration-limit' }
      )
    )
  }

  // Check min/max duration constraints
  if (
    config.minDurationSeconds !== undefined &&
    config.minDurationSeconds > config.maxDurationSeconds
  ) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Minimum duration (${config.minDurationSeconds}s) cannot exceed maximum (${config.maxDurationSeconds}s)`,
        navPath,
        { itemId: question.id, rule: 'audio-duration-constraint' }
      )
    )
  }

  // Check minimum duration is reasonable
  if (config.minDurationSeconds !== undefined && config.minDurationSeconds > 60) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Minimum duration should not exceed 60 seconds`,
        navPath,
        { itemId: question.id, rule: 'audio-min-duration-limit' }
      )
    )
  }

  return issues
}

// -----------------------------------------------------------------------------
// Display Logic Validator
// -----------------------------------------------------------------------------

function validateDisplayLogic(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  precedingQuestions: StudyFlowQuestion[],
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)
  const displayLogic = question.display_logic

  if (!displayLogic || !displayLogic.conditions) return issues

  const precedingIds = new Set(precedingQuestions.map(q => q.id))

  for (const condition of displayLogic.conditions) {
    if (!precedingIds.has(condition.questionId)) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Display logic references a non-existent or subsequent question`,
          navPath,
          { itemId: question.id, rule: 'display-logic-invalid-ref' }
        )
      )
      break // Only report once
    }
  }

  return issues
}

// -----------------------------------------------------------------------------
// Branching Logic Validator
// -----------------------------------------------------------------------------

function validateBranchingLogic(
  question: StudyFlowQuestion,
  section: FlowSection,
  position: number,
  navPath: ValidationNavigationPath
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sectionId = flowSectionToValidationSection(section)
  const questionLabel = getQuestionLabel(position)
  const branchingLogic = question.branching_logic as BranchingLogic | null

  if (!branchingLogic || !branchingLogic.rules) return issues

  // Get valid option IDs based on question type
  let optionIds: Set<string>

  if (question.question_type === 'yes_no') {
    // Yes/No questions have fixed option IDs
    optionIds = new Set(['yes', 'no'])
  } else {
    // Multiple choice questions get IDs from config.options
    const config = question.config as MultipleChoiceQuestionConfig
    optionIds = new Set((config.options || []).map(o => o.id))
  }

  // Check each rule references a valid option
  for (const rule of branchingLogic.rules) {
    if (!optionIds.has(rule.optionId)) {
      issues.push(
        createIssue(
          sectionId,
          `${questionLabel}: Branching logic references a non-existent option`,
          navPath,
          { itemId: question.id, rule: 'branching-logic-invalid-option' }
        )
      )
      break // Only report once
    }
  }

  return issues
}

// -----------------------------------------------------------------------------
// Batch Question Validation
// -----------------------------------------------------------------------------

/**
 * Validate all questions in a section
 * @param abTests - Optional AB tests keyed by question ID (entity_id)
 */
export function validateQuestionSection(
  section: FlowSection,
  questions: StudyFlowQuestion[],
  abTests?: Record<string, ABTestVariant>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Sort by position to ensure correct order
  const sorted = [...questions].sort((a, b) => a.position - b.position)

  for (let i = 0; i < sorted.length; i++) {
    const question = sorted[i]
    const preceding = sorted.slice(0, i)
    const abTest = abTests?.[question.id] || null
    issues.push(...validateQuestion(question, section, i, preceding, abTest))
  }

  return issues
}
