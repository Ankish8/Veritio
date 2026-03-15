// Re-export from refactored module for backward compatibility
export {
  getCardSortResults,
  getTreeTestResults,
  getSurveyResults,
  getPrototypeTestResults,
} from './results/index'

export type {
  CardSortResultsResponse,
  TreeTestResultsResponse,
  SurveyResultsResponse,
  PrototypeTestResultsResponse,
} from './results/index'
