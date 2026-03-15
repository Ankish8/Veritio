'use client';

import { useState } from 'react';
import { Switch } from '@veritio/ui/components/switch';
import { Label } from '@veritio/ui/components/label';
import { Button } from '@veritio/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select';
import { Input } from '@veritio/ui/components/input';
import { Plus, X, ArrowRight } from 'lucide-react';
import { cn } from '@veritio/ui';
import {
  BranchTargetSelector,
  BranchTargetValue,
  getBranchTargetRowClass,
} from './branch-target-selector';
import { AdvancedBranchingSection } from './advanced-branching-section';
import type {
  SurveyNumericBranchingLogic,
  SurveyNumericBranchingRule,
  SurveyNumericComparison,
  StudyFlowQuestion,
  SurveyCustomSection,
  AdvancedBranchingRules,
} from '../../../../lib/supabase/study-flow-types';

interface NumericBranchingEditorProps {
  branchingLogic: SurveyNumericBranchingLogic | null;
  onBranchingLogicChange: (logic: SurveyNumericBranchingLogic | null) => void;
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  minValue: number;
  maxValue: number;
  valueLabel?: string;
  disabled?: boolean;
  advancedRules?: AdvancedBranchingRules | null;
  onAdvancedRulesChange?: (rules: AdvancedBranchingRules | null) => void;
}

const OPERATOR_LABELS: Record<SurveyNumericComparison, string> = {
  equals: '=',
  less_than: '<',
  less_than_or_equals: '≤',
  greater_than: '>',
  greater_than_or_equals: '≥',
};

const OPERATOR_OPTIONS: { value: SurveyNumericComparison; label: string }[] = [
  { value: 'equals', label: '=' },
  { value: 'less_than', label: '<' },
  { value: 'less_than_or_equals', label: '≤' },
  { value: 'greater_than', label: '>' },
  { value: 'greater_than_or_equals', label: '≥' },
];
export function NumericBranchingEditor({
  branchingLogic,
  onBranchingLogicChange,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  minValue,
  maxValue,
  valueLabel = 'value',
  disabled = false,
  advancedRules,
  onAdvancedRulesChange,
}: NumericBranchingEditorProps) {
  // Check for both null and undefined to ensure toggle state matches content visibility
  const branchingEnabled = branchingLogic !== null && branchingLogic !== undefined;

  // Toggle branching on/off
  const handleToggleBranching = (enabled: boolean) => {
    if (enabled) {
      // Initialize with empty rules
      onBranchingLogicChange({
        type: 'numeric',
        rules: [],
        defaultTarget: 'continue',
      });
    } else {
      onBranchingLogicChange(null);
    }
  };

  // Add a new rule
  const handleAddRule = () => {
    if (!branchingLogic) return;

    const newRule: SurveyNumericBranchingRule = {
      comparison: 'less_than_or_equals',
      value: Math.floor((minValue + maxValue) / 2),
      target: 'continue',
    };

    onBranchingLogicChange({
      ...branchingLogic,
      rules: [...branchingLogic.rules, newRule],
    });
  };

  // Update a rule
  const handleUpdateRule = (
    index: number,
    updates: Partial<SurveyNumericBranchingRule>
  ) => {
    if (!branchingLogic) return;

    const newRules = [...branchingLogic.rules];
    newRules[index] = { ...newRules[index], ...updates };

    onBranchingLogicChange({
      ...branchingLogic,
      rules: newRules,
    });
  };

  // Delete a rule
  const handleDeleteRule = (index: number) => {
    if (!branchingLogic) return;

    const newRules = branchingLogic.rules.filter((_, i) => i !== index);
    onBranchingLogicChange({
      ...branchingLogic,
      rules: newRules,
    });
  };

  // Update default target
  const handleUpdateDefaultTarget = (targetValue: BranchTargetValue) => {
    if (!branchingLogic) return;

    onBranchingLogicChange({
      ...branchingLogic,
      defaultTarget: targetValue.target,
      defaultTargetId: targetValue.targetId,
    });
  };

  // Generate value options for the dropdown
  const valueOptions = Array.from(
    { length: maxValue - minValue + 1 },
    (_, i) => minValue + i
  );

  return (
    <div className="space-y-3">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Branching</Label>
          <p className="text-xs text-muted-foreground">
            Control participant flow based on numeric responses
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
        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
          {/* Rules List */}
          {branchingLogic.rules.length > 0 && (
            <div className="space-y-2">
              {branchingLogic.rules.map((rule, index) => (
                <RuleRow
                  key={index}
                  rule={rule}
                  index={index}
                  valueLabel={valueLabel}
                  minValue={minValue}
                  maxValue={maxValue}
                  valueOptions={valueOptions}
                  allQuestions={allQuestions}
                  customSections={customSections}
                  currentQuestionId={currentQuestionId}
                  currentSectionId={currentSectionId}
                  currentQuestionPosition={currentQuestionPosition}
                  flowSection={flowSection}
                  onUpdate={(updates) => handleUpdateRule(index, updates)}
                  onDelete={() => handleDeleteRule(index)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {/* Add Rule Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRule}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add threshold
          </Button>

          {/* Default Target (Otherwise) */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Otherwise</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <BranchTargetSelector
              value={{
                target: branchingLogic.defaultTarget,
                targetId: branchingLogic.defaultTargetId,
              }}
              onChange={handleUpdateDefaultTarget}
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
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function RuleRow({
  rule,
  index,
  valueLabel,
  minValue,
  maxValue,
  valueOptions,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  onUpdate,
  onDelete,
  disabled,
}: {
  rule: SurveyNumericBranchingRule;
  index: number;
  valueLabel: string;
  minValue: number;
  maxValue: number;
  valueOptions: number[];
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  onUpdate: (updates: Partial<SurveyNumericBranchingRule>) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const rowClass = getBranchTargetRowClass(rule.target);

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded border transition-colors',
        rowClass || 'bg-background'
      )}
    >
      {/* "If" label */}
      <span className="text-sm text-muted-foreground shrink-0">If {valueLabel}</span>

      {/* Operator Selector */}
      <Select
        value={rule.comparison}
        onValueChange={(value) =>
          onUpdate({ comparison: value as SurveyNumericComparison })
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-[60px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATOR_OPTIONS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      <Input
        type="number"
        min={minValue}
        max={maxValue}
        value={rule.value}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= minValue && val <= maxValue) {
            onUpdate({ value: val });
          }
        }}
        disabled={disabled}
        className="w-[60px] h-8"
      />

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Target Selector */}
      <BranchTargetSelector
        value={{
          target: rule.target,
          targetId: rule.targetId,
        }}
        onChange={(targetValue) =>
          onUpdate({
            target: targetValue.target,
            targetId: targetValue.targetId,
          })
        }
        questions={allQuestions}
        sections={customSections}
        currentQuestionId={currentQuestionId}
        currentSectionId={currentSectionId ?? undefined}
        currentQuestionPosition={currentQuestionPosition}
        flowSection={flowSection}
        disabled={disabled}
        className="flex-1"
      />

      {/* Delete Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={disabled}
        className="h-8 w-8 shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
