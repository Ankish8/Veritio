// Re-export from refactored module for backward compatibility
export {
  getStudyByShareCode,
  createParticipant,
  submitCardSortResponse,
  submitTreeTestResponse,
  completeSurveyParticipation,
  submitPrototypeTestResponse,
  submitFirstClickResponse,
} from './participant/index'

export type {
  StudyForParticipation,
  StudyPasswordRequired,
  PrototypeTestSubmissionInput,
  FirstClickSubmissionInput,
} from './participant/index'
