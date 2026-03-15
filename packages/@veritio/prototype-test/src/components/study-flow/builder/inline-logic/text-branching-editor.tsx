'use client';

import { Switch } from '@veritio/ui/components/switch';
import { Label } from '@veritio/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select';
import { ArrowRight } from 'lucide-react';
import { cn } from '@veritio/ui';
import {
  BranchTargetSelector,
  BranchTargetValue,
  getBranchTargetRowClass,
} from './branch-target-selector';
import { AdvancedBranchingSection } from './advanced-branching-section';
import type {
  SurveyTextBranchingLogic,
  SurveyTextBranchingRule,
  TextBranchCondition,
  StudyFlowQuestion,
  SurveyCustomSection,
  AdvancedBranchingRules,
} from '../../../../lib/supabase/study-flow-types';

interface TextBranchingEditorProps {
  branchingLogic: SurveyTextBranchingLogic | null;
  onBranchingLogicChange: (logic: SurveyTextBranchingLogic | null) => void;
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  disabled?: boolean;
  onCreateSection?: () => void;
  advancedRules?: AdvancedBranchingRules | null;
  onAdvancedRulesChange?: (rules: AdvancedBranchingRules | null) => void;
  isRequired?: boolean;
}

const CONDITION_LABELS: Record<TextBranchCondition, string> = {
  is_answered: 'is answered',
  is_empty: 'is empty',
};
export function TextBranchingEditor({
  branchingLogic,
  onBranchingLogicChange,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  disabled = false,
  onCreateSection,
  advancedRules,
  onAdvancedRulesChange,
  isRequired = false,
}: TextBranchingEditorProps) {
  // Check for both null and undefined to ensure toggle state matches content visibility
  const branchingEnabled = branchingLogic !== null && branchingLogic !== undefined;

  // Toggle branching on/off
  const handleToggleBranching = (enabled: boolean) => {
    if (enabled) {
      // Initialize with default rules
      // For required questions, only create "is_answered" rule since "is_empty" can never be true
      const rules: SurveyTextBranchingRule[] = [
        {
          id: crypto.randomUUID(),
          condition: 'is_answered',
          target: 'continue',
        },
      ];

      // Only add "is_empty" rule for non-required questions
      if (!isRequired) {
        rules.push({
          id: crypto.randomUUID(),
          condition: 'is_empty',
          target: 'continue',
        });
      }

      onBranchingLogicChange({
        type: 'text',
        rules,
        defaultTarget: 'continue',
      });
    } else {
      onBranchingLogicChange(null);
    }
  };

  // Get rule for a specific condition
  const getRuleForCondition = (condition: TextBranchCondition): SurveyTextBranchingRule | undefined => {
    return branchingLogic?.rules.find((r) => r.condition === condition);
  };

  // Update a rule by condition
  const handleUpdateRule = (condition: TextBranchCondition, targetValue: BranchTargetValue) => {
    if (!branchingLogic) return;

    const existingRule = getRuleForCondition(condition);

    if (existingRule) {
      // Update existing rule
      const newRules = branchingLogic.rules.map((r) =>
        r.condition === condition
          ? { ...r, target: targetValue.target, targetId: targetValue.targetId }
          : r
      );
      onBranchingLogicChange({
        ...branchingLogic,
        rules: newRules,
      });
    } else {
      // Add new rule
      onBranchingLogicChange({
        ...branchingLogic,
        rules: [
          ...branchingLogic.rules,
          {
            id: crypto.randomUUID(),
            condition,
            target: targetValue.target,
            targetId: targetValue.targetId,
          },
        ],
      });
    }
  };

  const answeredRule = getRuleForCondition('is_answered');
  const emptyRule = getRuleForCondition('is_empty');

  return (
    <div className="space-y-3">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Branching</Label>
          <p className="text-xs text-muted-foreground">
            Control participant flow based on text input
          </p>
        </div>
        <Switch
          checked={branchingEnabled}
          onCheckedChange={handleToggleBranching}
          disabled={disabled}
        />
      </div>

      {/* Branching Rules */}
      {branchingEnabled && branchingLogic && (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
          {/* If Answered */}
          <ConditionRow
            label="If answer is provided"
            rule={answeredRule}
            condition="is_answered"
            allQuestions={allQuestions}
            customSections={customSections}
            currentQuestionId={currentQuestionId}
            currentSectionId={currentSectionId}
            currentQuestionPosition={currentQuestionPosition}
            flowSection={flowSection}
            onUpdate={(targetValue) => handleUpdateRule('is_answered', targetValue)}
            disabled={disabled}
            onCreateSection={onCreateSection}
          />

          {/* If Empty - hidden when question is required since it can never be true */}
          {!isRequired && (
            <ConditionRow
              label="If answer is empty"
              rule={emptyRule}
              condition="is_empty"
              allQuestions={allQuestions}
              customSections={customSections}
              currentQuestionId={currentQuestionId}
              currentSectionId={currentSectionId}
              currentQuestionPosition={currentQuestionPosition}
              flowSection={flowSection}
              onUpdate={(targetValue) => handleUpdateRule('is_empty', targetValue)}
              disabled={disabled}
              onCreateSection={onCreateSection}
            />
          )}

          {/* Advanced Mode for cross-question conditions */}
          {onAdvancedRulesChange && (
            <div className="pt-2 border-t">
              <AdvancedBranchingSection
                advancedRules={advancedRules ?? null}
                onAdvancedRulesChange={onAdvancedRulesChange}
                allQuestions={allQuestions}
                customSections={customSections}
                currentQuestionId={currentQuestionId}
                disabled={disabled}
                onCreateSection={onCreateSection}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ConditionRow({
  label,
  rule,
  condition,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  onUpdate,
  disabled,
  onCreateSection,
}: {
  label: string;
  rule: SurveyTextBranchingRule | undefined;
  condition: TextBranchCondition;
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  onUpdate: (targetValue: BranchTargetValue) => void;
  disabled: boolean;
  onCreateSection?: () => void;
}) {
  const target = rule?.target || 'continue';
  const targetId = rule?.targetId;
  const rowClass = getBranchTargetRowClass(target);

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded border transition-colors',
        rowClass || 'bg-background'
      )}
    >
      {/* Condition Label */}
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Target Selector */}
      <BranchTargetSelector
        value={{ target, targetId }}
        onChange={onUpdate}
        questions={allQuestions}
        sections={customSections}
        currentQuestionId={currentQuestionId}
        currentSectionId={currentSectionId ?? undefined}
        currentQuestionPosition={currentQuestionPosition}
        flowSection={flowSection}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}
