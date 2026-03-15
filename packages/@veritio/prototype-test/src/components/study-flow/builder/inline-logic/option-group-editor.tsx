'use client';

import { useState, useMemo } from 'react';
import { Button } from '@veritio/ui/components/button';
import { Switch } from '@veritio/ui/components/switch';
import { Label } from '@veritio/ui/components/label';
import { Checkbox } from '@veritio/ui/components/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select';
import { Plus, X, ArrowRight, Users, Unlink } from 'lucide-react';
import { cn } from '@veritio/ui';
import {
  BranchTargetSelector,
  BranchTargetValue,
  getBranchTargetRowClass,
} from './branch-target-selector';
import { AdvancedBranchingSection } from './advanced-branching-section';
import type {
  ChoiceOption,
  SurveyGroupedBranchingLogic,
  OptionGroup,
  OptionGroupMatchMode,
  SurveyBranchingRule,
  StudyFlowQuestion,
  SurveyCustomSection,
  AdvancedBranchingRules,
} from '../../../../lib/supabase/study-flow-types';

interface OptionGroupEditorProps {
  options: ChoiceOption[];
  branchingLogic: SurveyGroupedBranchingLogic | null;
  onBranchingLogicChange: (logic: SurveyGroupedBranchingLogic | null) => void;
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
}
export function OptionGroupEditor({
  options,
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
}: OptionGroupEditorProps) {
  // Check for both null and undefined to ensure toggle state matches content visibility
  const branchingEnabled = branchingLogic !== null && branchingLogic !== undefined;
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Get options that are in a group
  const groupedOptionIds = useMemo(() => {
    if (!branchingLogic?.groups) return new Set<string>();
    const ids = new Set<string>();
    branchingLogic.groups.forEach((g) => g.optionIds.forEach((id) => ids.add(id)));
    return ids;
  }, [branchingLogic]);

  // Get ungrouped options
  const ungroupedOptions = useMemo(() => {
    return options.filter((opt) => !groupedOptionIds.has(opt.id));
  }, [options, groupedOptionIds]);

  // Toggle branching on/off
  const handleToggleBranching = (enabled: boolean) => {
    if (enabled) {
      onBranchingLogicChange({
        type: 'grouped',
        groups: [],
        individualRules: [],
        defaultTarget: 'continue',
      });
    } else {
      onBranchingLogicChange(null);
      setSelectedOptions(new Set());
      setIsCreatingGroup(false);
    }
  };

  // Handle option selection for group creation
  const handleToggleOptionSelection = (optionId: string) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      newSelected.add(optionId);
    }
    setSelectedOptions(newSelected);
  };

  // Create a new group from selected options
  const handleCreateGroup = () => {
    if (!branchingLogic || selectedOptions.size < 2) return;

    const newGroup: OptionGroup = {
      id: crypto.randomUUID(),
      optionIds: Array.from(selectedOptions),
      matchMode: 'any',
      target: 'continue',
    };

    // Remove any individual rules for these options
    const newIndividualRules = (branchingLogic.individualRules ?? []).filter(
      (r) => !selectedOptions.has(r.optionId)
    );

    onBranchingLogicChange({
      ...branchingLogic,
      groups: [...(branchingLogic.groups ?? []), newGroup],
      individualRules: newIndividualRules,
    });

    setSelectedOptions(new Set());
    setIsCreatingGroup(false);
  };

  // Update a group
  const handleUpdateGroup = (
    groupId: string,
    updates: Partial<Pick<OptionGroup, 'matchMode' | 'target' | 'targetId'>>
  ) => {
    if (!branchingLogic) return;

    const newGroups = (branchingLogic.groups ?? []).map((g) =>
      g.id === groupId ? { ...g, ...updates } : g
    );

    onBranchingLogicChange({
      ...branchingLogic,
      groups: newGroups,
    });
  };

  // Delete a group (ungroup options)
  const handleUngroupOptions = (groupId: string) => {
    if (!branchingLogic) return;

    const newGroups = (branchingLogic.groups ?? []).filter((g) => g.id !== groupId);

    onBranchingLogicChange({
      ...branchingLogic,
      groups: newGroups,
    });
  };

  // Update individual rule for ungrouped option
  const handleUpdateIndividualRule = (optionId: string, targetValue: BranchTargetValue) => {
    if (!branchingLogic) return;

    const rules = branchingLogic.individualRules ?? [];
    const existingRuleIndex = rules.findIndex((r) => r.optionId === optionId);

    // If target is default, remove the rule
    if (
      targetValue.target === branchingLogic.defaultTarget &&
      targetValue.targetId === branchingLogic.defaultTargetId
    ) {
      const newRules = rules.filter((r) => r.optionId !== optionId);
      onBranchingLogicChange({
        ...branchingLogic,
        individualRules: newRules,
      });
      return;
    }

    let newRules: SurveyBranchingRule[];
    if (existingRuleIndex >= 0) {
      newRules = rules.map((r) =>
        r.optionId === optionId
          ? { ...r, target: targetValue.target, targetId: targetValue.targetId }
          : r
      );
    } else {
      newRules = [
        ...rules,
        { optionId, target: targetValue.target, targetId: targetValue.targetId },
      ];
    }

    onBranchingLogicChange({
      ...branchingLogic,
      individualRules: newRules,
    });
  };

  // Get target for ungrouped option
  const getIndividualTarget = (optionId: string): BranchTargetValue => {
    if (!branchingLogic) return { target: 'continue' };
    const rule = (branchingLogic.individualRules ?? []).find((r) => r.optionId === optionId);
    if (rule) {
      return { target: rule.target, targetId: rule.targetId };
    }
    return {
      target: branchingLogic.defaultTarget,
      targetId: branchingLogic.defaultTargetId,
    };
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

  // Get option label by id
  const getOptionLabel = (optionId: string): string => {
    return options.find((o) => o.id === optionId)?.label || 'Unknown';
  };

  return (
    <div className="space-y-3">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Branching</Label>
          <p className="text-xs text-muted-foreground">
            Control participant flow based on option groups
          </p>
        </div>
        <Switch
          checked={branchingEnabled}
          onCheckedChange={handleToggleBranching}
          disabled={disabled}
        />
      </div>

      {/* Branching Content */}
      {branchingEnabled && branchingLogic && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
          {/* Existing Groups */}
          {(branchingLogic.groups?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Groups</Label>
              {branchingLogic.groups?.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  options={options}
                  allQuestions={allQuestions}
                  customSections={customSections}
                  currentQuestionId={currentQuestionId}
                  currentSectionId={currentSectionId}
                  currentQuestionPosition={currentQuestionPosition}
                  flowSection={flowSection}
                  onUpdate={(updates) => handleUpdateGroup(group.id, updates)}
                  onUngroup={() => handleUngroupOptions(group.id)}
                  disabled={disabled}
                  onCreateSection={onCreateSection}
                  getOptionLabel={getOptionLabel}
                />
              ))}
            </div>
          )}

          {/* Ungrouped Options */}
          {ungroupedOptions.length > 0 && (
            <div className="space-y-2">
              {(branchingLogic.groups?.length ?? 0) > 0 && (
                <Label className="text-xs text-muted-foreground">Individual Options</Label>
              )}
              {ungroupedOptions.map((option) => (
                <UngroupedOptionRow
                  key={option.id}
                  option={option}
                  isSelectable={isCreatingGroup}
                  isSelected={selectedOptions.has(option.id)}
                  onToggleSelection={() => handleToggleOptionSelection(option.id)}
                  target={getIndividualTarget(option.id)}
                  onUpdateTarget={(target) => handleUpdateIndividualRule(option.id, target)}
                  allQuestions={allQuestions}
                  customSections={customSections}
                  currentQuestionId={currentQuestionId}
                  currentSectionId={currentSectionId}
                  currentQuestionPosition={currentQuestionPosition}
                  flowSection={flowSection}
                  disabled={disabled}
                  onCreateSection={onCreateSection}
                />
              ))}
            </div>
          )}

          {/* Group Creation UI */}
          {isCreatingGroup ? (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                Select {selectedOptions.size < 2 ? `at least 2 options` : `${selectedOptions.size} selected`}
              </span>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingGroup(false);
                  setSelectedOptions(new Set());
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateGroup}
                disabled={selectedOptions.size < 2}
              >
                <Users className="h-4 w-4 mr-1" />
                Create Group
              </Button>
            </div>
          ) : (
            ungroupedOptions.length >= 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreatingGroup(true)}
                disabled={disabled}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create option group
              </Button>
            )
          )}

          {/* Default Target */}
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
                onCreateSection={onCreateSection}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function GroupRow({
  group,
  options,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  onUpdate,
  onUngroup,
  disabled,
  onCreateSection,
  getOptionLabel,
}: {
  group: OptionGroup;
  options: ChoiceOption[];
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  onUpdate: (updates: Partial<Pick<OptionGroup, 'matchMode' | 'target' | 'targetId'>>) => void;
  onUngroup: () => void;
  disabled: boolean;
  onCreateSection?: () => void;
  getOptionLabel: (id: string) => string;
}) {
  const rowClass = getBranchTargetRowClass(group.target);

  return (
    <div className={cn('rounded border p-2 space-y-2 transition-colors', rowClass || 'bg-background')}>
      {/* Group Options */}
      <div className="flex items-start gap-2">
        <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1">
            {group.optionIds.map((optionId) => (
              <span
                key={optionId}
                className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[120px]"
                title={getOptionLabel(optionId)}
              >
                {getOptionLabel(optionId)}
              </span>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onUngroup}
          disabled={disabled}
          className="h-6 w-6 shrink-0"
          title="Ungroup options"
        >
          <Unlink className="h-3 w-3" />
        </Button>
      </div>

      {/* Match Mode & Target */}
      <div className="flex items-center gap-2 pl-6">
        <span className="text-sm text-muted-foreground shrink-0">If</span>
        <Select
          value={group.matchMode}
          onValueChange={(value) => onUpdate({ matchMode: value as OptionGroupMatchMode })}
          disabled={disabled}
        >
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ANY</SelectItem>
            <SelectItem value="all">ALL</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground shrink-0">selected</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <BranchTargetSelector
          value={{ target: group.target, targetId: group.targetId }}
          onChange={(targetValue) =>
            onUpdate({ target: targetValue.target, targetId: targetValue.targetId })
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
      </div>
    </div>
  );
}
function UngroupedOptionRow({
  option,
  isSelectable,
  isSelected,
  onToggleSelection,
  target,
  onUpdateTarget,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  disabled,
  onCreateSection,
}: {
  option: ChoiceOption;
  isSelectable: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  target: BranchTargetValue;
  onUpdateTarget: (target: BranchTargetValue) => void;
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  currentSectionId?: string | null;
  currentQuestionPosition?: number;
  flowSection?: string;
  disabled: boolean;
  onCreateSection?: () => void;
}) {
  const rowClass = getBranchTargetRowClass(target.target);

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded border transition-colors',
        rowClass || 'bg-background',
        isSelectable && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={isSelectable ? onToggleSelection : undefined}
    >
      {/* Selection Checkbox (only in group creation mode) */}
      {isSelectable && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          className="shrink-0"
        />
      )}

      {/* Option Label */}
      <span className="text-sm truncate flex-1 min-w-0" title={option.label}>
        {option.label}
      </span>

      {/* Target Selector (only when not selecting) */}
      {!isSelectable && (
        <>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <BranchTargetSelector
            value={target}
            onChange={onUpdateTarget}
            questions={allQuestions}
            sections={customSections}
            currentQuestionId={currentQuestionId}
            currentSectionId={currentSectionId ?? undefined}
            currentQuestionPosition={currentQuestionPosition}
            flowSection={flowSection}
            disabled={disabled}
            className="w-[180px]"
          />
        </>
      )}
    </div>
  );
}
