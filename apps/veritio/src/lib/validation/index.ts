// =============================================================================
// VALIDATION MODULE
// Public exports for the study validation system
// =============================================================================

// Types
export type {
  ValidationSectionId,
  BuilderTabId,
  ValidationNavigationPath,
  ValidationIssue,
  ValidationResult,
  StudyValidationInput,
} from './types'

export { SECTION_LABELS } from './types'

// Main validation function
export { validateStudy, hasValidationIssues, getValidationIssueCount } from './study-validation'

// Utilities (for testing or advanced use)
export { isHtmlEmpty, truncateText, stripHtml } from './utils'
