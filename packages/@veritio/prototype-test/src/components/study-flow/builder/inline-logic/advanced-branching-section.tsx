'use client';

import { useState, useMemo } from 'react';
import { Button } from '@veritio/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@veritio/ui/components/collapsible';
import { ChevronDown, Plus, Sparkles } from 'lucide-react';
import { cn } from '@veritio/ui';
import { BranchCard } from './advanced-branching-components';
import type {
  AdvancedBranchingRules,
  AdvancedBranch,
  AdvancedCondition,
  StudyFlowQuestion,
  SurveyCustomSection,
} from '../../../../lib/supabase/study-flow-types';

interface AdvancedBranchingSectionProps {
  advancedRules: AdvancedBranchingRules | null;
  onAdvancedRulesChange: (rules: AdvancedBranchingRules | null) => void;
  allQuestions: StudyFlowQuestion[];
  customSections: SurveyCustomSection[];
  currentQuestionId: string;
  disabled?: boolean;
  onCreateSection?: () => void;
}
export function AdvancedBranchingSection({
  advancedRules,
  onAdvancedRulesChange,
  allQuestions,
  customSections,
  currentQuestionId,
  disabled = false,
  onCreateSection,
}: AdvancedBranchingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get questions that can be referenced (exclude current question)
  // Only survey/pre/post study questions can be referenced for conditions
  const referenceableQuestions = useMemo(() => {
    return allQuestions.filter(
      (q) => q.id !== currentQuestionId && ['survey', 'pre_study', 'post_study'].includes(q.section)
    );
  }, [allQuestions, currentQuestionId]);

  const hasBranches = advancedRules && advancedRules.branches.length > 0;

  // Add a new branch with a default empty condition
  const handleAddBranch = () => {
    const newBranch: AdvancedBranch = {
      id: crypto.randomUUID(),
      conditions: [
        {
          id: crypto.randomUUID(),
          source: 'question',
          operator: 'equals',
        },
      ],
      matchAll: true,
      target: 'continue',
    };

    if (advancedRules) {
      onAdvancedRulesChange({
        ...advancedRules,
        branches: [...advancedRules.branches, newBranch],
        enabled: true,
      });
    } else {
      onAdvancedRulesChange({
        branches: [newBranch],
        enabled: true,
      });
    }

    setIsOpen(true);
  };

  // Update a branch by ID
  const handleUpdateBranch = (branchId: string, updates: Partial<AdvancedBranch>) => {
    if (!advancedRules) return;

    const newBranches = advancedRules.branches.map((b) =>
      b.id === branchId ? { ...b, ...updates } : b
    );

    onAdvancedRulesChange({
      ...advancedRules,
      branches: newBranches,
    });
  };

  // Delete a branch by ID
  const handleDeleteBranch = (branchId: string) => {
    if (!advancedRules) return;

    const newBranches = advancedRules.branches.filter((b) => b.id !== branchId);

    if (newBranches.length === 0) {
      onAdvancedRulesChange(null);
    } else {
      onAdvancedRulesChange({
        ...advancedRules,
        branches: newBranches,
      });
    }
  };

  // Add a new condition to a specific branch
  const handleAddCondition = (branchId: string) => {
    if (!advancedRules) return;

    const newCondition: AdvancedCondition = {
      id: crypto.randomUUID(),
      source: 'question',
      operator: 'equals',
    };

    const newBranches = advancedRules.branches.map((b) =>
      b.id === branchId ? { ...b, conditions: [...b.conditions, newCondition] } : b
    );

    onAdvancedRulesChange({
      ...advancedRules,
      branches: newBranches,
    });
  };

  // Update a specific condition within a branch
  const handleUpdateCondition = (
    branchId: string,
    conditionId: string,
    updates: Partial<AdvancedCondition>
  ) => {
    if (!advancedRules) return;

    const newBranches = advancedRules.branches.map((b) =>
      b.id === branchId
        ? {
            ...b,
            conditions: b.conditions.map((c) =>
              c.id === conditionId ? { ...c, ...updates } : c
            ),
          }
        : b
    );

    onAdvancedRulesChange({
      ...advancedRules,
      branches: newBranches,
    });
  };

  // Delete a condition from a branch (removes branch if last condition)
  const handleDeleteCondition = (branchId: string, conditionId: string) => {
    if (!advancedRules) return;

    const newBranches = advancedRules.branches.map((b) =>
      b.id === branchId
        ? { ...b, conditions: b.conditions.filter((c) => c.id !== conditionId) }
        : b
    );

    // Remove branch if no conditions left
    const filteredBranches = newBranches.filter((b) => b.conditions.length > 0);

    if (filteredBranches.length === 0) {
      onAdvancedRulesChange(null);
    } else {
      onAdvancedRulesChange({
        ...advancedRules,
        branches: filteredBranches,
      });
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm hover:opacity-70">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="font-medium">Advanced mode</span>
          {hasBranches && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              {advancedRules!.branches.length} branch{advancedRules!.branches.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Create complex rules with multiple conditions across questions.
        </p>

        {/* Branches List */}
        {advancedRules && advancedRules.branches.length > 0 && (
          <div className="space-y-3">
            {advancedRules.branches.map((branch, index) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                index={index}
                referenceableQuestions={referenceableQuestions}
                allQuestions={allQuestions}
                customSections={customSections}
                currentQuestionId={currentQuestionId}
                onUpdate={(updates) => handleUpdateBranch(branch.id, updates)}
                onDelete={() => handleDeleteBranch(branch.id)}
                onAddCondition={() => handleAddCondition(branch.id)}
                onUpdateCondition={(conditionId, updates) =>
                  handleUpdateCondition(branch.id, conditionId, updates)
                }
                onDeleteCondition={(conditionId) =>
                  handleDeleteCondition(branch.id, conditionId)
                }
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Add Branch Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddBranch}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add advanced branch
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
