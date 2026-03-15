'use client'

import { Switch } from '@veritio/ui'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Shuffle, MessageSquarePlus, GitBranch, Hash } from 'lucide-react'
import type { ChoiceOption, SurveyCustomSection, StudyFlowQuestion, SurveyBranchingLogic } from '../../../../lib/supabase/study-flow-types'
import { SurveyOptionsWithLogic } from '../inline-logic'

interface ABTestOptionsConfigProps {
  variantAOptions: ChoiceOption[]
  variantBOptions: ChoiceOption[]
  onVariantAOptionsChange: (options: ChoiceOption[]) => void
  onVariantBOptionsChange: (options: ChoiceOption[]) => void
  // Branching logic for each variant
  variantABranchingLogic?: SurveyBranchingLogic | null
  variantBBranchingLogic?: SurveyBranchingLogic | null
  onVariantABranchingLogicChange?: (logic: SurveyBranchingLogic | null) => void
  onVariantBBranchingLogicChange?: (logic: SurveyBranchingLogic | null) => void
  // Shuffle and Other option settings for each variant
  variantAShuffle?: boolean
  variantBShuffle?: boolean
  onVariantAShuffleChange?: (shuffle: boolean) => void
  onVariantBShuffleChange?: (shuffle: boolean) => void
  variantAAllowOther?: boolean
  variantBAllowOther?: boolean
  onVariantAAllowOtherChange?: (allowOther: boolean) => void
  onVariantBAllowOtherChange?: (allowOther: boolean) => void
  variantAOtherLabel?: string
  variantBOtherLabel?: string
  onVariantAOtherLabelChange?: (label: string) => void
  onVariantBOtherLabelChange?: (label: string) => void
  // Context props needed by SurveyOptionsWithLogic
  allQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
  currentQuestionId: string
  currentSectionId?: string | null
  currentQuestionPosition: number
  flowSection: string
}
export function ABTestOptionsConfig({
  variantAOptions,
  variantBOptions,
  onVariantAOptionsChange,
  onVariantBOptionsChange,
  variantABranchingLogic,
  variantBBranchingLogic,
  onVariantABranchingLogicChange,
  onVariantBBranchingLogicChange,
  variantAShuffle,
  variantBShuffle,
  onVariantAShuffleChange,
  onVariantBShuffleChange,
  variantAAllowOther,
  variantBAllowOther,
  onVariantAAllowOtherChange,
  onVariantBAllowOtherChange,
  variantAOtherLabel,
  variantBOtherLabel,
  onVariantAOtherLabelChange,
  onVariantBOtherLabelChange,
  allQuestions,
  customSections,
  currentQuestionId,
  currentSectionId,
  currentQuestionPosition,
  flowSection,
}: ABTestOptionsConfigProps) {
  // Derived state for Conditions and Scoring toggles
  const variantAHasConditions = !!variantABranchingLogic
  const variantBHasConditions = !!variantBBranchingLogic
  const variantAHasScoring = variantAOptions.some((opt) => opt.score !== undefined)
  const variantBHasScoring = variantBOptions.some((opt) => opt.score !== undefined)

  // Handlers for Conditions toggle
  const handleVariantAConditionsToggle = (enabled: boolean) => {
    onVariantABranchingLogicChange?.(enabled ? { rules: [], defaultTarget: 'continue' } : null)
  }

  const handleVariantBConditionsToggle = (enabled: boolean) => {
    onVariantBBranchingLogicChange?.(enabled ? { rules: [], defaultTarget: 'continue' } : null)
  }

  // Handlers for Scoring toggle
  const handleVariantAScoringToggle = (enabled: boolean) => {
    if (enabled) {
      onVariantAOptionsChange(variantAOptions.map((opt) => ({ ...opt, score: opt.score ?? 0 })))
    } else {
      onVariantAOptionsChange(variantAOptions.map(({ score, ...rest }) => rest))
    }
  }

  const handleVariantBScoringToggle = (enabled: boolean) => {
    if (enabled) {
      onVariantBOptionsChange(variantBOptions.map((opt) => ({ ...opt, score: opt.score ?? 0 })))
    } else {
      onVariantBOptionsChange(variantBOptions.map(({ score, ...rest }) => rest))
    }
  }

  return (
    <div className="space-y-3">
      {/* Variant A Options */}
      <div className="border-l-4 border-l-purple-500 pl-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-purple-600">
          Variant A
        </div>

        {/* Variant A Toggles - All 4 in one row */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <Switch
              id="variant-a-shuffle"
              checked={variantAShuffle || false}
              onCheckedChange={onVariantAShuffleChange ?? (() => {})}
            />
            <Label htmlFor="variant-a-shuffle" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <Shuffle className="h-4 w-4 text-muted-foreground" />
              Shuffle options
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="variant-a-allow-other"
              checked={variantAAllowOther || false}
              onCheckedChange={onVariantAAllowOtherChange ?? (() => {})}
            />
            <Label htmlFor="variant-a-allow-other" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
              &apos;Other&apos; option
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="variant-a-conditions"
              checked={variantAHasConditions}
              onCheckedChange={handleVariantAConditionsToggle}
            />
            <Label htmlFor="variant-a-conditions" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Conditions
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="variant-a-scoring"
              checked={variantAHasScoring}
              onCheckedChange={handleVariantAScoringToggle}
            />
            <Label htmlFor="variant-a-scoring" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Scoring
            </Label>
          </div>
        </div>

        {/* Variant A Other Label Input */}
        {variantAAllowOther && (
          <div className="space-y-2">
            <Label htmlFor="variant-a-other-label" className="text-sm text-muted-foreground">
              &apos;Other&apos; label
            </Label>
            <Input
              id="variant-a-other-label"
              value={variantAOtherLabel || ''}
              onChange={(e) => onVariantAOtherLabelChange?.(e.target.value)}
              placeholder="Other (please specify)"
              className="max-w-xs"
            />
          </div>
        )}

        <SurveyOptionsWithLogic
          options={variantAOptions}
          surveyBranchingLogic={variantABranchingLogic ?? null}
          onOptionsChange={onVariantAOptionsChange}
          onBranchingLogicChange={onVariantABranchingLogicChange ?? (() => {})}
          allQuestions={allQuestions}
          customSections={customSections}
          currentQuestionId={currentQuestionId}
          currentSectionId={currentSectionId}
          currentQuestionPosition={currentQuestionPosition}
          flowSection={flowSection}
          supportsBranching={true}
          hideToggles={true}
        />
      </div>

      {/* Variant B Options */}
      <div className="border-l-4 border-l-orange-500 pl-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-orange-600">
          Variant B
        </div>

        {/* Variant B Toggles - All 4 in one row */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <Switch
              id="variant-b-shuffle"
              checked={variantBShuffle || false}
              onCheckedChange={onVariantBShuffleChange ?? (() => {})}
            />
            <Label htmlFor="variant-b-shuffle" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <Shuffle className="h-4 w-4 text-muted-foreground" />
              Shuffle options
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="variant-b-allow-other"
              checked={variantBAllowOther || false}
              onCheckedChange={onVariantBAllowOtherChange ?? (() => {})}
            />
            <Label htmlFor="variant-b-allow-other" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
              &apos;Other&apos; option
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="variant-b-conditions"
              checked={variantBHasConditions}
              onCheckedChange={handleVariantBConditionsToggle}
            />
            <Label htmlFor="variant-b-conditions" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Conditions
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="variant-b-scoring"
              checked={variantBHasScoring}
              onCheckedChange={handleVariantBScoringToggle}
            />
            <Label htmlFor="variant-b-scoring" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Scoring
            </Label>
          </div>
        </div>

        {/* Variant B Other Label Input */}
        {variantBAllowOther && (
          <div className="space-y-2">
            <Label htmlFor="variant-b-other-label" className="text-sm text-muted-foreground">
              &apos;Other&apos; label
            </Label>
            <Input
              id="variant-b-other-label"
              value={variantBOtherLabel || ''}
              onChange={(e) => onVariantBOtherLabelChange?.(e.target.value)}
              placeholder="Other (please specify)"
              className="max-w-xs"
            />
          </div>
        )}

        <SurveyOptionsWithLogic
          options={variantBOptions}
          surveyBranchingLogic={variantBBranchingLogic ?? null}
          onOptionsChange={onVariantBOptionsChange}
          onBranchingLogicChange={onVariantBBranchingLogicChange ?? (() => {})}
          allQuestions={allQuestions}
          customSections={customSections}
          currentQuestionId={currentQuestionId}
          currentSectionId={currentSectionId}
          currentQuestionPosition={currentQuestionPosition}
          flowSection={flowSection}
          supportsBranching={true}
          hideToggles={true}
        />
      </div>
    </div>
  )
}
