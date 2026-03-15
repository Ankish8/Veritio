// =============================================================================
// Variables, Piping, A/B Testing, and Resume Type Definitions

import type { FlowStep, QuestionType, QuestionConfig, QuestionImage, ResponseValue, StudyFlowQuestion } from './question-types'
import type { SurveyCustomSection } from './rules-types'
// Answer Piping Types
// Dynamic text replacement in questions based on previous answers
export interface PipingReference {
  type: 'id' | 'title';
  questionId?: string;
  questionTitle?: string;
  raw: string;
}
// A/B Testing Types
// Split testing for questions and sections
export interface ABTestVariant {
  id: string;
  study_id: string;
  entity_type: 'question' | 'section';
  entity_id: string;
  variant_a_content: StudyFlowQuestion | SurveyCustomSection;
  variant_b_content: StudyFlowQuestion | SurveyCustomSection;
  split_percentage: number;
  is_enabled: boolean;
  created_at: string;
}
export interface ParticipantVariantAssignment {
  id: string;
  participant_id: string;
  ab_test_variant_id: string;
  assigned_variant: 'A' | 'B';
  assigned_at: string | null;
}
export interface ABTestStatistics {
  variant_a_count: number;
  variant_b_count: number;
  variant_a_completion_rate?: number;
  variant_b_completion_rate?: number;
  p_value?: number;
  confidence_interval?: [number, number];
  is_significant: boolean;
}
// Resume/Partial Response Types
// For saving and restoring participant progress
export interface ResumeTokenData {
  token: string;
  email?: string;
  expires_at: string;
  last_activity_at: string;
}
export interface SurveyProgressState {
  study_id: string;
  participant_id: string;
  session_token: string;
  current_step: FlowStep;
  current_question_index: number;
  responses: Record<string, ResponseValue>;
  last_saved: number; // timestamp
  expires_at: number; // timestamp
}
export function getSurveyProgressKey(studyCode: string, participantId: string): string {
  return `survey_progress_${studyCode}_${participantId}`;
}
// First Impression Design Types
// Design variants and per-design questions
export type FirstImpressionDisplayMode = 'fit' | 'fill' | 'actual' | 'hidpi';
export type FirstImpressionDesignAssignmentMode = 'random_single' | 'sequential_all';
export type FirstImpressionQuestionDisplayMode = 'one_per_page' | 'all_on_page';
export interface FirstImpressionDesign {
  id: string;
  study_id: string;
  name?: string | null;
  position: number;
  image_url?: string | null;
  original_filename?: string | null;
  source_type: 'upload' | 'figma';
  figma_file_key?: string | null;
  figma_node_id?: string | null;
  width?: number | null;
  height?: number | null;
  mobile_image_url?: string | null;
  mobile_width?: number | null;
  mobile_height?: number | null;
  display_mode: FirstImpressionDisplayMode;
  background_color: string;
  weight: number; // 0-100 for A/B testing weight
  is_practice: boolean;
  questions: FirstImpressionDesignQuestion[];
  created_at: string;
  updated_at: string;
}
export interface FirstImpressionDesignQuestion {
  id: string;
  question_type: QuestionType;
  question_text: string;
  question_text_html?: string | null;
  description?: string | null;
  is_required: boolean;
  config: QuestionConfig;
  image?: QuestionImage | null;
  position: number;
}
