import type { ValidationConfigInput, ValidationConfigResult } from './types'
import type { ValidationIssue } from '../types'

export function createValidationConfig<TInput extends object>(
  config: ValidationConfigInput<TInput>
): ValidationConfigResult<TInput> {
  const {
    validate,
    validators = {},
    priorityMap = {},
  } = config

  const applyPriority = (issues: ValidationIssue[]): ValidationIssue[] => {
    return issues.map((issue) => ({
      ...issue,
      severity: priorityMap[issue.code] || issue.severity || 'error',
    }))
  }

  return {
    validate: (input) => {
      const result = validate(input)
      return {
        ...result,
        issues: applyPriority(result.issues),
      }
    },

    validateContent: (input) => {
      return applyPriority(validators.content?.(input) || [])
    },

    validateFlow: (input) => {
      return applyPriority(validators.flow?.(input) || [])
    },

    validateSettings: (input) => {
      return applyPriority(validators.settings?.(input) || [])
    },
  }
}
