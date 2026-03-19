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
import type { ValidationIssue, ValidationNavigationPath, ValidationSectionId } from './types'
import { flowSectionToValidationSection, flowSectionToActiveSection } from './types'
import {
  createIssue,
  isHtmlEmpty,
  truncateText,
  getQuestionLabel,
  findDuplicateLabels,
  findEmptyLabels,
} from './utils'

// -----------------------------------------------------------------------------
// Labelled Items Validation (shared by matrix rows/columns, ranking items)
// -----------------------------------------------------------------------------

/**
 * Validate an array of labelled items for empty and duplicate labels.
 * Used by matrix rows, matrix columns, and ranking items.
 */
function validateLabelledItems(
  items: Array<{ label: string; id: string }>,
  sectionId: ValidationSectionId,
  questionLabel: string,
  navPath: ValidationNavigationPath,
  questionId: string,
  entityName: string,
  rules: { emptyRule: string; duplicateRule: string }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const emptyItems = findEmptyLabels(items)
  if (emptyItems.length > 0) {
    const labelText = emptyItems.length === 1
      ? `A ${entityName} label is`
      : `${emptyItems.length} ${entityName} labels are`
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: ${labelText} empty`,
        navPath,
        { itemId: questionId, rule: rules.emptyRule }
      )
    )
  }

  // Single pass: only call findDuplicateLabels (not hasDuplicateLabels then findDuplicateLabels)
  const duplicates = findDuplicateLabels(items)
  if (duplicates.length > 0) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Duplicate ${entityName} "${truncateText(duplicates[0], 20)}"`,
        navPath,
        { itemId: questionId, rule: rules.duplicateRule }
      )
    )
  }

  return issues
}

// -----------------------------------------------------------------------------
// AB Test Validation
// -----------------------------------------------------------------------------

function validateAbTestQuestionText(
  abTest: ABTestVariant,
  sectionId: ValidationSectionId,
  questionLabel: string,
  navPath: ValidationNavigationPath,
  questionId: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Validate variant A question text
  const variantA = abTest.variant_a_content as unknown as Record<string, unknown>
  const variantAText = variantA.question_text as string | undefined
  const variantAHtml = variantA.question_text_html as string | undefined
  if (isHtmlEmpty(variantAText) && isHtmlEmpty(variantAHtml)) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Variant A question text is empty`,
        navPath,
        { itemId: questionId, rule: 'empty-label' }
      )
    )
  }

  // Validate variant B question text
  const variantB = abTest.variant_b_content as unknown as Record<string, unknown>
  const variantBText = variantB?.question_text as string | undefined
  const variantBHtml = variantB?.question_text_html as string | undefined
  if (isHtmlEmpty(variantBText) && isHtmlEmpty(variantBHtml)) {
    issues.push(
      createIssue(
        sectionId,
        `${questionLabel}: Variant B question text is empty`,
        navPath,
        { itemId: questionId, rule: 'empty-label' }
      )
    )
  }

  return issues
}

function hasAbTestQuestionText(abTest: ABTestVariant | null | undefined): boolean {
  return Boolean(
    abTest?.is_enabled &&
    abTest.variant_a_content &&
    typeof abTest.variant_a_content === 'object' &&
    ('question_text' in abTest.variant_a_content || 'question_text_html' in abTest.variant_a_content)
  )
}

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

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: flowSectionToActiveSection(section),
    questionId: question.id,
  }

  const abTestHasText = hasAbTestQuestionText(abTest)

  // Check question text is not empty (check AB test variant if present)
  if (!abTestHasText) {
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
    issues.push(...validateAbTestQuestionText(abTest!, sectionId, questionLabel, navPath, question.id))
  }

  // Check question is not still in default/unconfigured state
  if (!abTestHasText && question.question_text === 'New question') {
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

  // Validate row labels (empty + duplicate in single pass)
  if (config.rows) {
    issues.push(...validateLabelledItems(
      config.rows,
      sectionId,
      questionLabel,
      navPath,
      question.id,
      'row',
      { emptyRule: 'matrix-empty-row', duplicateRule: 'matrix-duplicate-row' }
    ))
  }

  // Validate column labels (empty + duplicate in single pass)
  if (config.columns) {
    issues.push(...validateLabelledItems(
      config.columns,
      sectionId,
      questionLabel,
      navPath,
      question.id,
      'column',
      { emptyRule: 'matrix-empty-column', duplicateRule: 'matrix-duplicate-column' }
    ))
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

  // Validate item labels (empty + duplicate in single pass)
  if (config.items) {
    issues.push(...validateLabelledItems(
      config.items,
      sectionId,
      questionLabel,
      navPath,
      question.id,
      'item',
      { emptyRule: 'ranking-empty-item', duplicateRule: 'ranking-duplicate-item' }
    ))
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

  // Get valid option IDs based on question type with proper type guard
  let optionIds: Set<string>

  if (question.question_type === 'yes_no') {
    optionIds = new Set(['yes', 'no'])
  } else if (question.question_type === 'multiple_choice') {
    const config = question.config as MultipleChoiceQuestionConfig
    optionIds = new Set((config.options || []).map(o => o.id))
  } else {
    // Branching logic on unsupported question types: skip validation
    return issues
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

  // Use running accumulator instead of sorted.slice(0, i) to avoid O(n^2) temporary arrays
  const preceding: StudyFlowQuestion[] = []
  for (let i = 0; i < sorted.length; i++) {
    const question = sorted[i]
    const abTest = abTests?.[question.id] || null
    issues.push(...validateQuestion(question, section, i, preceding, abTest))
    preceding.push(question)
  }

  return issues
}
