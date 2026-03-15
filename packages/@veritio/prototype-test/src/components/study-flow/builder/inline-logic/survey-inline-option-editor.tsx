'use client';

import { Input } from '@veritio/ui/components/input';
import { Button } from '@veritio/ui/components/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@veritio/ui';
import type {
  ChoiceOption,
  StudyFlowQuestion,
  SurveyCustomSection,
  ScreeningCondition,
} from '../../../../lib/supabase/study-flow-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BranchTargetSelector,
  type BranchTargetValue,
  getBranchTargetRowClass,
} from './branch-target-selector';
import { CompoundConditionBuilder } from '../question-builder/compound-condition-builder';

interface SurveyInlineOptionEditorProps {
  option: ChoiceOption;
  index: number;
  branchTarget: BranchTargetValue;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateTarget: (id: string, target: BranchTargetValue) => void;
  onUpdateScore: (id: string, score: number | undefined) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  questions: StudyFlowQuestion[];
  sections: SurveyCustomSection[];
  currentQuestionId?: string;
  currentSectionId?: string;
  currentQuestionPosition?: number;
  flowSection?: string;
  scoringEnabled?: boolean;
  branchingEnabled?: boolean;
  disabled?: boolean;
  conditions?: ScreeningCondition[];
  matchAll?: boolean;
  availableQuestions?: StudyFlowQuestion[];
  onUpdateConditions?: (
    id: string,
    conditions: ScreeningCondition[],
    matchAll: boolean
  ) => void;
}
export function SurveyInlineOptionEditor({
  option,
  index,
  branchTarget,
  onUpdateLabel,
  onUpdateTarget,
  onUpdateScore,
  onDelete,
  canDelete,
  questions,
  sections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  scoringEnabled = false,
  branchingEnabled = true,
  disabled = false,
  conditions = [],
  matchAll = true,
  availableQuestions = [],
  onUpdateConditions,
}: SurveyInlineOptionEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowClassName = branchingEnabled ? getBranchTargetRowClass(branchTarget.target) : '';

  // Show compound conditions when:
  // 1. Branching is enabled
  // 2. Target is NOT 'continue' (we have a jump/end action)
  // 3. There are other questions available to reference
  const showConditions =
    branchingEnabled &&
    branchTarget.target !== 'continue' &&
    availableQuestions.length > 0;

  const handleConditionsChange = (
    newConditions: ScreeningCondition[],
    newMatchAll: boolean
  ) => {
    onUpdateConditions?.(option.id, newConditions, newMatchAll);
  };

  return (
    <div className="space-y-0">
      {/* Main Option Row */}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border transition-colors',
          rowClassName,
          isDragging && 'opacity-50 shadow-lg',
          disabled && 'opacity-60'
        )}
      >
        {/* Drag Handle */}
        <button
          className={cn(
            'cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0',
            disabled && 'cursor-not-allowed'
          )}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Index Badge */}
        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
          {index + 1}
        </span>

        {/* Option Label Input */}
        <Input
          value={option.label}
          onChange={(e) => onUpdateLabel(option.id, e.target.value)}
          placeholder={`Option ${index + 1}`}
          className="flex-1 min-w-0 h-9"
          disabled={disabled}
        />

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(option.id)}
          disabled={!canDelete || disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Branching Section */}
        {branchingEnabled && (
          <>
            <span className="text-sm text-muted-foreground shrink-0">then</span>
            <BranchTargetSelector
              value={branchTarget}
              onChange={(target) => onUpdateTarget(option.id, target)}
              questions={questions}
              sections={sections}
              currentQuestionId={currentQuestionId}
              currentSectionId={currentSectionId}
              currentQuestionPosition={currentQuestionPosition}
              flowSection={flowSection}
              disabled={disabled}
            />
          </>
        )}

        {/* Score Input */}
        {scoringEnabled && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm text-muted-foreground">+</span>
            <Input
              type="number"
              value={option.score ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateScore(option.id, val === '' ? undefined : parseInt(val, 10));
              }}
              placeholder="0"
              className="w-20 h-9 text-center"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Compound Conditions (shown below option when target is not 'continue') */}
      {showConditions && (
        <CompoundConditionBuilder
          conditions={conditions}
          matchAll={matchAll}
          availableQuestions={availableQuestions}
          onConditionsChange={handleConditionsChange}
          maxConditions={3}
          disabled={disabled}
        />
      )}
    </div>
  );
}
export function StaticSurveyInlineOptionEditor({
  option,
  index,
  branchTarget,
  onUpdateLabel,
  onUpdateTarget,
  onUpdateScore,
  onDelete,
  canDelete,
  questions,
  sections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  scoringEnabled = false,
  branchingEnabled = true,
  disabled = false,
  conditions = [],
  matchAll = true,
  availableQuestions = [],
  onUpdateConditions,
}: SurveyInlineOptionEditorProps) {
  const rowClassName = branchingEnabled ? getBranchTargetRowClass(branchTarget.target) : '';

  // Show compound conditions when:
  // 1. Branching is enabled
  // 2. Target is NOT 'continue' (we have a jump/end action)
  // 3. There are other questions available to reference
  const showConditions =
    branchingEnabled &&
    branchTarget.target !== 'continue' &&
    availableQuestions.length > 0;

  const handleConditionsChange = (
    newConditions: ScreeningCondition[],
    newMatchAll: boolean
  ) => {
    onUpdateConditions?.(option.id, newConditions, newMatchAll);
  };

  return (
    <div className="space-y-0">
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border transition-colors',
          rowClassName,
          disabled && 'opacity-60'
        )}
      >
        {/* Index Badge */}
        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
          {index + 1}
        </span>

        {/* Option Label Input */}
        <Input
          value={option.label}
          onChange={(e) => onUpdateLabel(option.id, e.target.value)}
          placeholder={`Option ${index + 1}`}
          className="flex-1 min-w-0 h-9"
          disabled={disabled}
        />

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(option.id)}
          disabled={!canDelete || disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Branching Section */}
        {branchingEnabled && (
          <>
            <span className="text-sm text-muted-foreground shrink-0">then</span>
            <BranchTargetSelector
              value={branchTarget}
              onChange={(target) => onUpdateTarget(option.id, target)}
              questions={questions}
              sections={sections}
              currentQuestionId={currentQuestionId}
              currentSectionId={currentSectionId}
              currentQuestionPosition={currentQuestionPosition}
              flowSection={flowSection}
              disabled={disabled}
            />
          </>
        )}

        {/* Score Input */}
        {scoringEnabled && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm text-muted-foreground">+</span>
            <Input
              type="number"
              value={option.score ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateScore(option.id, val === '' ? undefined : parseInt(val, 10));
              }}
              placeholder="0"
              className="w-20 h-9 text-center"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Compound Conditions (shown below option when target is not 'continue') */}
      {showConditions && (
        <CompoundConditionBuilder
          conditions={conditions}
          matchAll={matchAll}
          availableQuestions={availableQuestions}
          onConditionsChange={handleConditionsChange}
          maxConditions={3}
          disabled={disabled}
        />
      )}
    </div>
  );
}
