import type { PlayerConfigInput, PlayerConfigResult } from './types'
import type { ValidationResult } from '../types'

const defaultValidation = (): ValidationResult => ({
  isValid: true,
  issues: [],
  issueCount: 0,
})

export function createPlayerConfig<TProps extends object>(
  config: PlayerConfigInput<TProps>
): PlayerConfigResult<TProps> {
  const {
    Component,
    Skeleton,
    extractSettings,
    defaultProps = {},
    validateProps = defaultValidation,
  } = config

  return {
    Component,
    Skeleton,
    extractSettings: (rawSettings) => ({
      ...defaultProps,
      ...extractSettings(rawSettings),
    }),
    validateProps,
  }
}
