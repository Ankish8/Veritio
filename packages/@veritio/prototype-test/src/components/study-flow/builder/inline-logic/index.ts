// Inline Logic Components
// Survey branching and scoring for questions

export {
  BranchTargetSelector,
  encodeBranchTarget,
  decodeBranchTarget,
  getBranchTargetRowClass,
  type BranchTargetValue,
  type EncodedBranchTarget,
} from './branch-target-selector';

export {
  SurveyInlineOptionEditor,
  StaticSurveyInlineOptionEditor,
} from './survey-inline-option-editor';

export { SurveyOptionsWithLogic } from './survey-options-with-logic';

export { NumericBranchingEditor } from './numeric-branching-editor';

export { TextBranchingEditor } from './text-branching-editor';

export { OptionGroupEditor } from './option-group-editor';

export { AdvancedBranchingSection } from './advanced-branching-section';

export { EnhancedBranchingEditor } from './enhanced-branching-editor';

export {
  BranchCard,
  ConditionRow,
  OPERATOR_LABELS,
  VALUE_LESS_OPERATORS,
  CHOICE_OPERATORS,
  NUMERIC_OPERATORS,
  TEXT_OPERATORS,
} from './advanced-branching-components';
