import type { ResultsConfigInput, ResultsConfigResult } from './types'

export function createResultsConfig<TResults extends object>(
  config: ResultsConfigInput<TResults>
): ResultsConfigResult<TResults> {
  const {
    tabs,
    endpoint,
    transformResponse = (data) => data as TResults,
    OverviewComponent,
  } = config

  return {
    tabs,
    endpoint,
    transformResponse,
    OverviewComponent,
  }
}
