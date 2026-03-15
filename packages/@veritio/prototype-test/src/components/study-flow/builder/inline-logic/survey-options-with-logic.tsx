'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@veritio/ui/components/button';
import { Switch } from '@veritio/ui/components/switch';
import { Label } from '@veritio/ui/components/label';
import { Plus, Calculator } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type {
  ChoiceOption,
  StudyFlowQuestion,
  SurveyCustomSection,
  SurveyBranchingLogic,
  SurveyBranchingRule,
  AdvancedBranchingRules,
  ScreeningCondition,
} from '../../../../lib/supabase/study-flow-types';
import { SurveyInlineOptionEditor } from './survey-inline-option-editor';
import type { BranchTargetValue } from './branch-target-selector';
import {
  advancedConditionsToScreening,
  screeningConditionsToAdvanced,
} from '@veritio/prototype-test/lib/study-flow/condition-evaluator';

interface SurveyOptionsWithLogicProps {
  options: ChoiceOption[];
  surveyBranchingLogic?: SurveyBranchingLogic | null;
  onOptionsChange: (options: ChoiceOption[]) => void;
  onBranchingLogicChange: (logic: SurveyBranchingLogic | null) => void;
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  supportsBranching?: boolean;
  minOptions?: number;
  maxOptions?: number;
  disabled?: boolean;
  onCreateSection?: () => void;
  advancedRules?: AdvancedBranchingRules | null;
  onAdvancedRulesChange?: (rules: AdvancedBranchingRules | null) => void;
  hideToggles?: boolean;
  onBranchingToggle?: (enabled: boolean) => void;
  onScoringToggle?: (enabled: boolean) => void;
}
export function SurveyOptionsWithLogic({
  options,
  surveyBranchingLogic,
  onOptionsChange,
  onBranchingLogicChange,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  supportsBranching = true,
  minOptions = 2,
  maxOptions = 20,
  disabled = false,
  onCreateSection,
  advancedRules,
  onAdvancedRulesChange,
  hideToggles = false,
  onBranchingToggle,
  onScoringToggle,
}: SurveyOptionsWithLogicProps) {
  // Ensure options is always an array (guard against undefined/null)
  const safeOptions = Array.isArray(options) ? options : []

  // Determine if branching/scoring is enabled
  const branchingEnabled = surveyBranchingLogic !== null && surveyBranchingLogic !== undefined;
  const scoringEnabled = safeOptions.some((opt) => opt.score !== undefined);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get branch target for an option
  const getBranchTarget = useCallback(
    (optionId: string): BranchTargetValue => {
      if (!surveyBranchingLogic) {
        return { target: 'continue' };
      }
      const rule = surveyBranchingLogic.rules.find((r) => r.optionId === optionId);
      if (rule) {
        return { target: rule.target, targetId: rule.targetId };
      }
      return {
        target: surveyBranchingLogic.defaultTarget,
        targetId: surveyBranchingLogic.defaultTargetId,
      };
    },
    [surveyBranchingLogic]
  );

  // Get conditions for an option (converted from AdvancedCondition to ScreeningCondition for UI)
  const getConditionsForOption = useCallback(
    (optionId: string): { conditions: ScreeningCondition[]; matchAll: boolean } => {
      if (!surveyBranchingLogic) return { conditions: [], matchAll: true };
      const rule = surveyBranchingLogic.rules.find((r) => r.optionId === optionId);
      if (!rule?.conditions || rule.conditions.length === 0) {
        return { conditions: [], matchAll: true };
      }
      // Convert AdvancedCondition[] to ScreeningCondition[] for the UI
      const screeningConditions = advancedConditionsToScreening(rule.conditions);
      return {
        conditions: screeningConditions,
        matchAll: rule.matchAll !== false, // Default to true (AND)
      };
    },
    [surveyBranchingLogic]
  );

  // Get available questions for compound conditions (same section, excluding current)
  const availableQuestions = useMemo(() => {
    return allQuestions.filter((q) => q.id !== currentQuestionId);
  }, [allQuestions, currentQuestionId]);

  // Handle option label change
  const handleUpdateLabel = useCallback(
    (id: string, label: string) => {
      onOptionsChange(safeOptions.map((opt) => (opt.id === id ? { ...opt, label } : opt)));
    },
    [safeOptions, onOptionsChange]
  );

  // Handle branch target change
  const handleUpdateTarget = useCallback(
    (optionId: string, target: BranchTargetValue) => {
      if (!branchingEnabled) return;

      const currentRules = surveyBranchingLogic?.rules || [];
      const defaultTarget = surveyBranchingLogic?.defaultTarget || 'continue';
      const defaultTargetId = surveyBranchingLogic?.defaultTargetId;

      // If target is the same as default, remove the rule
      if (target.target === defaultTarget && target.targetId === defaultTargetId) {
        const newRules = currentRules.filter((r) => r.optionId !== optionId);
        onBranchingLogicChange({
          rules: newRules,
          defaultTarget,
          defaultTargetId,
        });
        return;
      }

      // Update or add the rule
      const existingRuleIndex = currentRules.findIndex((r) => r.optionId === optionId);
      let newRules: SurveyBranchingRule[];

      if (existingRuleIndex >= 0) {
        newRules = currentRules.map((r, i) =>
          i === existingRuleIndex ? { ...r, target: target.target, targetId: target.targetId } : r
        );
      } else {
        newRules = [
          ...currentRules,
          { optionId, target: target.target, targetId: target.targetId },
        ];
      }

      onBranchingLogicChange({
        rules: newRules,
        defaultTarget,
        defaultTargetId,
      });
    },
    [surveyBranchingLogic, branchingEnabled, onBranchingLogicChange]
  );

  // Handle conditions change for an option (compound conditions)
  const handleUpdateConditions = useCallback(
    (optionId: string, conditions: ScreeningCondition[], matchAll: boolean) => {
      if (!branchingEnabled || !surveyBranchingLogic) return;

      const currentRules = surveyBranchingLogic.rules;
      const existingRuleIndex = currentRules.findIndex((r) => r.optionId === optionId);

      // Convert ScreeningCondition[] to AdvancedCondition[] for storage
      const advancedConditions = screeningConditionsToAdvanced(conditions);

      let newRules: SurveyBranchingRule[];

      if (existingRuleIndex >= 0) {
        // Update existing rule with conditions
        newRules = currentRules.map((r, i) =>
          i === existingRuleIndex
            ? {
                ...r,
                conditions: advancedConditions.length > 0 ? advancedConditions : undefined,
                matchAll: advancedConditions.length > 0 ? matchAll : undefined,
              }
            : r
        );
      } else {
        // Shouldn't happen normally - conditions only shown for non-continue targets
        // which should already have a rule
        return;
      }

      onBranchingLogicChange({
        ...surveyBranchingLogic,
        rules: newRules,
      });
    },
    [surveyBranchingLogic, branchingEnabled, onBranchingLogicChange]
  );

  // Handle score change
  const handleUpdateScore = useCallback(
    (id: string, score: number | undefined) => {
      onOptionsChange(safeOptions.map((opt) => (opt.id === id ? { ...opt, score } : opt)));
    },
    [safeOptions, onOptionsChange]
  );

  // Handle delete
  const handleDelete = useCallback(
    (id: string) => {
      // Remove option
      const newOptions = safeOptions.filter((opt) => opt.id !== id);
      onOptionsChange(newOptions);

      // Remove any branching rules for this option
      if (surveyBranchingLogic) {
        const newRules = surveyBranchingLogic.rules.filter((r) => r.optionId !== id);
        onBranchingLogicChange({
          ...surveyBranchingLogic,
          rules: newRules,
        });
      }
    },
    [safeOptions, surveyBranchingLogic, onOptionsChange, onBranchingLogicChange]
  );

  // Handle add option
  const handleAddOption = useCallback(() => {
    const newOption: ChoiceOption = {
      id: crypto.randomUUID(),
      label: '',
      score: scoringEnabled ? 0 : undefined,
    };
    onOptionsChange([...safeOptions, newOption]);
  }, [safeOptions, scoringEnabled, onOptionsChange]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = safeOptions.findIndex((opt) => opt.id === active.id);
        const newIndex = safeOptions.findIndex((opt) => opt.id === over.id);
        onOptionsChange(arrayMove(safeOptions, oldIndex, newIndex));
      }
    },
    [safeOptions, onOptionsChange]
  );

  // Toggle branching
  const handleToggleBranching = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        // Enable with default settings
        onBranchingLogicChange({
          rules: [],
          defaultTarget: 'continue',
        });
      } else {
        // Disable branching
        onBranchingLogicChange(null);
      }
      // Call external callback if provided
      onBranchingToggle?.(enabled);
    },
    [onBranchingLogicChange, onBranchingToggle]
  );

  // Toggle scoring
  const handleToggleScoring = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        // Add score: 0 to all options
        onOptionsChange(safeOptions.map((opt) => ({ ...opt, score: opt.score ?? 0 })));
      } else {
        // Remove scores from all options
        onOptionsChange(safeOptions.map(({ score, ...rest }) => rest));
      }
      // Call external callback if provided
      onScoringToggle?.(enabled);
    },
    [safeOptions, onOptionsChange, onScoringToggle]
  );

  const canDelete = safeOptions.length > minOptions;
  const canAdd = safeOptions.length < maxOptions;

  return (
    <div className="space-y-4">
      {/* Toggle Controls - can be hidden when controlled externally */}
      {!hideToggles && (
        <div className="flex items-center gap-6 pb-2 border-b">
          {supportsBranching && (
            <div className="flex items-center gap-2">
              <Switch
                id="branching-toggle"
                checked={branchingEnabled}
                onCheckedChange={handleToggleBranching}
                disabled={disabled}
              />
              <Label htmlFor="branching-toggle" className="text-sm cursor-pointer">
                Branching
              </Label>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id="scoring-toggle"
              checked={scoringEnabled}
              onCheckedChange={handleToggleScoring}
              disabled={disabled}
            />
            <Label htmlFor="scoring-toggle" className="text-sm flex items-center gap-1.5 cursor-pointer">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              Scoring
            </Label>
          </div>
        </div>
      )}

      {/* Options List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={safeOptions.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {safeOptions.map((option, index) => {
              const { conditions, matchAll } = getConditionsForOption(option.id);
              return (
                <SurveyInlineOptionEditor
                  key={`${option.id}-${branchingEnabled}`}
                  option={option}
                  index={index}
                  branchTarget={getBranchTarget(option.id)}
                  onUpdateLabel={handleUpdateLabel}
                  onUpdateTarget={handleUpdateTarget}
                  onUpdateScore={handleUpdateScore}
                  onDelete={handleDelete}
                  canDelete={canDelete}
                  questions={allQuestions}
                  sections={customSections}
                  currentQuestionId={currentQuestionId}
                  currentSectionId={currentSectionId ?? undefined}
                  currentQuestionPosition={currentQuestionPosition}
                  flowSection={flowSection}
                  scoringEnabled={scoringEnabled}
                  branchingEnabled={branchingEnabled}
                  disabled={disabled}
                  conditions={conditions}
                  matchAll={matchAll}
                  availableQuestions={availableQuestions}
                  onUpdateConditions={handleUpdateConditions}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Option Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddOption}
        disabled={!canAdd || disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add option
      </Button>

      {/* Scoring Indicator */}
      {scoringEnabled && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5" />
          <span>
            Scores will be summed automatically. Total possible: {' '}
            {safeOptions.reduce((sum, opt) => sum + (opt.score || 0), 0)}
          </span>
        </div>
      )}
    </div>
  );
}
