'use client';

import { useMemo } from 'react';
import { Button } from '@veritio/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@veritio/ui/components/select';
import { Input } from '@veritio/ui/components/input';
import { Plus, X, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@veritio/ui';
import {
  BranchTargetSelector,
  getBranchTargetRowClass,
} from './branch-target-selector';
import type {
  AdvancedBranch,
  AdvancedCondition,
  AdvancedConditionOperator,
  StudyFlowQuestion,
  SurveyCustomSection,
  ChoiceOption,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
} from '../../../../lib/supabase/study-flow-types';

export const OPERATOR_LABELS: Record<AdvancedConditionOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  is_answered: 'is answered',
  is_not_answered: 'is not answered',
  greater_than: '>',
  less_than: '<',
  greater_than_or_equals: '≥',
  less_than_or_equals: '≤',
};

// Operators that don't need a value
export const VALUE_LESS_OPERATORS: AdvancedConditionOperator[] = ['is_answered', 'is_not_answered'];

// Operators for different question types
export const CHOICE_OPERATORS: AdvancedConditionOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'is_answered',
  'is_not_answered',
];

export const NUMERIC_OPERATORS: AdvancedConditionOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'greater_than_or_equals',
  'less_than_or_equals',
  'is_answered',
  'is_not_answered',
];

export const TEXT_OPERATORS: AdvancedConditionOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'is_answered',
  'is_not_answered',
];
export function ConditionRow({
  condition,
  referenceableQuestions,
  onUpdate,
  onDelete,
  disabled,
  canDelete,
}: {
  condition: AdvancedCondition;
  referenceableQuestions: StudyFlowQuestion[];
  onUpdate: (updates: Partial<AdvancedCondition>) => void;
  onDelete: () => void;
  disabled: boolean;
  canDelete: boolean;
}) {
  const selectedQuestion = referenceableQuestions.find((q) => q.id === condition.questionId);

  // Get operators based on question type
  const availableOperators = useMemo(() => {
    if (!selectedQuestion) return CHOICE_OPERATORS;

    const type = selectedQuestion.question_type;
    if (['likert', 'nps', 'opinion_scale', 'slider'].includes(type)) return NUMERIC_OPERATORS;
    if (['single_line_text', 'multi_line_text'].includes(type)) return TEXT_OPERATORS;
    return CHOICE_OPERATORS;
  }, [selectedQuestion]);

  // Get options for choice questions
  const choiceOptions = useMemo(() => {
    if (!selectedQuestion) return [];
    const config = selectedQuestion.config as unknown as
      | MultipleChoiceQuestionConfig
      | YesNoQuestionConfig;
    return (config as MultipleChoiceQuestionConfig).options || [];
  }, [selectedQuestion]);

  const isChoiceQuestion =
    selectedQuestion &&
    ['multiple_choice', 'yes_no'].includes(selectedQuestion.question_type);

  const isNumericQuestion =
    selectedQuestion && ['opinion_scale', 'nps', 'slider'].includes(selectedQuestion.question_type);

  const needsValue = !VALUE_LESS_OPERATORS.includes(condition.operator);

  return (
    <div className="flex items-center gap-2 p-2 rounded border bg-background">
      {/* Question Selector */}
      <Select
        value={condition.questionId || ''}
        onValueChange={(val) => onUpdate({ questionId: val, value: undefined })}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Select question" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-xs">Questions</SelectLabel>
            {referenceableQuestions.map((q) => (
              <SelectItem key={q.id} value={q.id} className="text-xs">
                <span className="truncate max-w-[120px]">
                  {q.question_text.slice(0, 25)}
                  {q.question_text.length > 25 ? '...' : ''}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Operator Selector */}
      <Select
        value={condition.operator}
        onValueChange={(val) => onUpdate({ operator: val as AdvancedConditionOperator })}
        disabled={disabled || !condition.questionId}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((op) => (
            <SelectItem key={op} value={op} className="text-xs">
              {OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input/Selector */}
      {needsValue && condition.questionId && (
        <>
          {isChoiceQuestion && choiceOptions.length > 0 ? (
            <Select
              value={(condition.value as string) || ''}
              onValueChange={(val) => onUpdate({ value: val })}
              disabled={disabled}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {choiceOptions.map((opt: ChoiceOption) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : isNumericQuestion ? (
            <Input
              type="number"
              value={condition.value ?? ''}
              onChange={(e) => onUpdate({ value: parseInt(e.target.value, 10) || undefined })}
              disabled={disabled}
              className="w-[60px] h-8 text-xs"
              placeholder="0"
            />
          ) : (
            <Input
              type="text"
              value={(condition.value as string) || ''}
              onChange={(e) => onUpdate({ value: e.target.value })}
              disabled={disabled}
              className="w-[100px] h-8 text-xs"
              placeholder="Value"
            />
          )}
        </>
      )}

      {/* Delete Button */}
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disabled}
          className="h-7 w-7 shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
export function BranchCard({
  branch,
  index,
  referenceableQuestions,
  allQuestions,
  customSections,
  currentQuestionId,
  onUpdate,
  onDelete,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
  disabled,
}: {
  branch: AdvancedBranch;
  index: number;
  referenceableQuestions: StudyFlowQuestion[];
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  onUpdate: (updates: Partial<AdvancedBranch>) => void;
  onDelete: () => void;
  onAddCondition: () => void;
  onUpdateCondition: (conditionId: string, updates: Partial<AdvancedCondition>) => void;
  onDeleteCondition: (conditionId: string) => void;
  disabled: boolean;
}) {
  const rowClass = getBranchTargetRowClass(branch.target);

  return (
    <div className={cn('border rounded-lg p-3 space-y-3', rowClass || 'bg-muted/20')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Branch {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disabled}
          className="h-7 w-7"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {branch.conditions.map((condition, condIndex) => (
          <div key={condition.id}>
            {/* AND/OR separator */}
            {condIndex > 0 && (
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <Select
                  value={branch.matchAll ? 'and' : 'or'}
                  onValueChange={(val) => onUpdate({ matchAll: val === 'and' })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[70px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">AND</SelectItem>
                    <SelectItem value="or">OR</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <ConditionRow
              condition={condition}
              referenceableQuestions={referenceableQuestions}
              onUpdate={(updates) => onUpdateCondition(condition.id, updates)}
              onDelete={() => onDeleteCondition(condition.id)}
              disabled={disabled}
              canDelete={branch.conditions.length > 1}
            />
          </div>
        ))}
      </div>

      {/* Add Condition Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAddCondition}
        disabled={disabled}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add condition
      </Button>

      {/* Target */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <span className="text-sm text-muted-foreground">Then</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <BranchTargetSelector
          value={{ target: branch.target, targetId: branch.targetId }}
          onChange={(targetValue) =>
            onUpdate({ target: targetValue.target, targetId: targetValue.targetId })
          }
          questions={allQuestions}
          sections={customSections}
          currentQuestionId={currentQuestionId}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </div>
  );
}
