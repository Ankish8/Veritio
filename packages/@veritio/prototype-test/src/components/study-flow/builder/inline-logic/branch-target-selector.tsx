'use client';

import { useMemo, useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@veritio/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@veritio/ui/components/popover';
import { Button } from '@veritio/ui/components/button';
import { ArrowRight, LayoutGrid, Info, XCircle, MessageSquare, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@veritio/ui';
import type { SurveyBranchTarget, StudyFlowQuestion, SurveyCustomSection } from '../../../../lib/supabase/study-flow-types';
export type EncodedBranchTarget = string;

export interface BranchTargetValue {
  target: SurveyBranchTarget;
  targetId?: string;
}
export function encodeBranchTarget(value: BranchTargetValue): EncodedBranchTarget {
  switch (value.target) {
    case 'continue':
      return 'continue';
    case 'end_survey':
      return 'end_survey';
    case 'skip_to_question':
      return `question:${value.targetId}`;
    case 'skip_to_section':
      return `section:${value.targetId}`;
    default:
      return 'continue';
  }
}
export function decodeBranchTarget(encoded: EncodedBranchTarget): BranchTargetValue {
  if (encoded === 'continue') {
    return { target: 'continue' };
  }
  if (encoded === 'end_survey') {
    return { target: 'end_survey' };
  }
  if (encoded.startsWith('question:')) {
    return { target: 'skip_to_question', targetId: encoded.replace('question:', '') };
  }
  if (encoded.startsWith('section:')) {
    return { target: 'skip_to_section', targetId: encoded.replace('section:', '') };
  }
  return { target: 'continue' };
}
export function getBranchTargetRowClass(target: SurveyBranchTarget): string {
  switch (target) {
    case 'skip_to_question':
    case 'skip_to_section':
      return 'bg-purple-50/50 border-purple-200/50';
    case 'end_survey':
      return 'bg-amber-50/50 border-amber-200/50';
    default:
      return '';
  }
}

interface BranchTargetSelectorProps {
  value: BranchTargetValue;
  onChange: (value: BranchTargetValue) => void;
  questions: StudyFlowQuestion[];
  sections: SurveyCustomSection[];
  currentQuestionId?: string;
  currentSectionId?: string;
  currentQuestionPosition?: number;
  flowSection?: string;
  disabled?: boolean;
  className?: string;
}
export function BranchTargetSelector({
  value,
  onChange,
  questions,
  sections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
  disabled = false,
  className,
}: BranchTargetSelectorProps) {
  // Sort sections by position and filter out current section
  const sortedSections = useMemo(() => {
    return [...sections]
      .filter((s) => s.id !== currentSectionId) // Can't jump to own section
      .sort((a, b) => a.position - b.position);
  }, [sections, currentSectionId]);

  // Filter questions for "Jump to Question" - same section, forward only
  const filteredQuestions = useMemo(() => {
    // Need position to filter forward-only
    if (currentQuestionPosition === undefined) return [];

    return questions
      .filter((q) => {
        // Exclude current question
        if (q.id === currentQuestionId) return false;

        // Forward only - must be after current position
        if (q.position <= currentQuestionPosition) return false;

        // If current question is in a custom section, only show questions in same section
        if (currentSectionId) {
          return q.custom_section_id === currentSectionId;
        }

        // If no custom section (loose question), show questions in same flow section
        return q.section === flowSection;
      })
      .sort((a, b) => a.position - b.position);
  }, [questions, currentQuestionId, currentQuestionPosition, currentSectionId, flowSection]);

  const encodedValue = encodeBranchTarget(value);

  const handleChange = (encoded: string) => {
    onChange(decodeBranchTarget(encoded));
  };

  // Get display label for current value
  const getDisplayLabel = () => {
    switch (value.target) {
      case 'continue':
        return 'Continue';
      case 'end_survey':
        return 'End Survey';
      case 'skip_to_question': {
        const q = questions.find((q) => q.id === value.targetId);
        if (!q) return 'Jump to...';
        // Find the question's index within its section for display
        const sectionQuestions = questions
          .filter((sq) => currentSectionId ? sq.custom_section_id === currentSectionId : sq.section === flowSection)
          .sort((a, b) => a.position - b.position);
        const qIndex = sectionQuestions.findIndex((sq) => sq.id === q.id);
        return `→ Q${qIndex + 1}`;
      }
      case 'skip_to_section': {
        const s = sections.find((s) => s.id === value.targetId);
        return s ? `→ ${s.name}` : 'Jump to...';
      }
      default:
        return 'Continue';
    }
  };

  const hasQuestions = filteredQuestions.length > 0;
  const hasSections = sortedSections.length > 0;
  const hasAdvancedBranching = hasQuestions || hasSections;

  // Helper to get truncated question text for display
  const getQuestionDisplayText = (q: StudyFlowQuestion, index: number) => {
    const text = q.question_text || `Question ${index + 1}`;
    const truncated = text.length > 30 ? text.slice(0, 30) + '...' : text;
    return `Q${index + 1}: ${truncated}`;
  };

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-[180px] h-9 shrink-0 justify-between font-normal',
            !value.target && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{getDisplayLabel()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search targets..." />
          <CommandList>
            <CommandEmpty>
              {!hasAdvancedBranching ? (
                <div className="px-2 py-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Create Sections from the sidebar to enable advanced branching.</span>
                </div>
              ) : (
                'No matching targets found.'
              )}
            </CommandEmpty>

            {/* Actions Group */}
            <CommandGroup heading="Actions">
              <CommandItem
                value="continue"
                onSelect={() => {
                  handleChange('continue');
                  setOpen(false);
                }}
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>Continue</span>
                {encodedValue === 'continue' && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
              <CommandItem
                value="end_survey"
                onSelect={() => {
                  handleChange('end_survey');
                  setOpen(false);
                }}
              >
                <XCircle className="h-4 w-4 text-amber-500" />
                <span>End Survey</span>
                {encodedValue === 'end_survey' && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
            </CommandGroup>

            {/* Jump to Question - same section, forward only */}
            {hasQuestions && (
              <CommandGroup heading="Jump to Question">
                {filteredQuestions.map((q, idx) => {
                  const itemValue = `question:${q.id}`;
                  return (
                    <CommandItem
                      key={q.id}
                      value={getQuestionDisplayText(q, idx)}
                      onSelect={() => {
                        handleChange(itemValue);
                        setOpen(false);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="truncate">{getQuestionDisplayText(q, idx)}</span>
                      {encodedValue === itemValue && (
                        <Check className="ml-auto h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Custom Sections */}
            {hasSections && (
              <CommandGroup heading="Jump to Section">
                {sortedSections.map((section) => {
                  const itemValue = `section:${section.id}`;
                  return (
                    <CommandItem
                      key={section.id}
                      value={section.name}
                      onSelect={() => {
                        handleChange(itemValue);
                        setOpen(false);
                      }}
                    >
                      <LayoutGrid className="h-4 w-4 text-purple-500" />
                      <span className="truncate">{section.name}</span>
                      {encodedValue === itemValue && (
                        <Check className="ml-auto h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
