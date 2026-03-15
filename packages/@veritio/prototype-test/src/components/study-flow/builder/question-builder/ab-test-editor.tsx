'use client'

import { useRef } from 'react'
import {
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui'
import { FlaskConical, HelpCircle } from 'lucide-react'
import { DescriptionPipingInsert } from './description-piping-insert'
import { RichTextEditor } from '../rich-text-editor'
import { useYjsOptional } from '@veritio/prototype-test/components/yjs/yjs-provider'
import { CollaborativeEditor } from '../../../yjs/collaborative-editor'
import { useRichTextRefine, type RefineSlots } from '../sections/rich-text-refine-context'
import { CollaborativeTextarea } from '../../../yjs/collaborative-textarea'
import type { ChoiceOption, StudyFlowQuestion } from '../../../../lib/supabase/study-flow-types'

interface ABTestVariantContent {
  question_text?: string
  question_text_html?: string
  description?: string
  options?: ChoiceOption[]
}

interface ABTestHeaderControlsProps {
  isEnabled: boolean
  isLoading?: boolean
  onToggle: (enabled: boolean) => void
  isChoiceType: boolean
  includeDescription: boolean
  includeOptions: boolean
  onIncludeDescriptionToggle: (include: boolean) => void
  onIncludeOptionsToggle: (include: boolean) => void
  splitValue: number
  onSplitValueChange: (value: number) => void
  onSplitCommit: (value: number) => void
}

interface ABTestVariantEditorsProps {
  questionId: string
  studyId?: string
  variantAContent: ABTestVariantContent
  variantBContent: ABTestVariantContent
  onVariantATextChange: (html: string) => void
  onVariantBTextChange: (html: string) => void
  enablePiping?: boolean
  availableQuestions?: StudyFlowQuestion[]
  fallbackContent?: string
}

interface ABTestDescriptionSectionProps {
  questionId: string
  isEnabled: boolean
  includeDescription: boolean
  variantAContent: ABTestVariantContent
  variantBContent: ABTestVariantContent
  onVariantADescriptionChange: (value: string) => void
  onVariantBDescriptionChange: (value: string) => void
  description: string | null
  onDescriptionChange: (value: string | null) => void
  availableQuestions?: StudyFlowQuestion[]
}
export function ABTestHeaderControls({
  isEnabled,
  isLoading = false,
  onToggle,
  isChoiceType,
  includeDescription,
  includeOptions,
  onIncludeDescriptionToggle,
  onIncludeOptionsToggle,
  splitValue,
  onSplitValueChange,
  onSplitCommit,
}: ABTestHeaderControlsProps) {
  // Compute current scope value from include flags
  const scopeValue =
    includeDescription && includeOptions ? 'everything' :
    includeOptions ? 'question_options' :
    includeDescription ? 'question_notes' :
    'question_only'

  // Handle scope dropdown change
  const handleScopeChange = (value: string) => {
    const wantDescription = value === 'question_notes' || value === 'everything'
    const wantOptions = value === 'question_options' || value === 'everything'
    if (wantDescription !== includeDescription) {
      onIncludeDescriptionToggle(wantDescription)
    }
    if (wantOptions !== includeOptions) {
      onIncludeOptionsToggle(wantOptions)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Toggle with tooltip */}
      <div className="flex items-center gap-2">
        <Switch
          id="ab-test-toggle"
          checked={isEnabled}
          onCheckedChange={onToggle}
          disabled={isLoading}
          className="scale-90"
        />
        <Label
          htmlFor="ab-test-toggle"
          className={cn(
            "text-sm cursor-pointer flex items-center gap-1",
            isEnabled ? "text-purple-600 font-medium" : "text-muted-foreground"
          )}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {isLoading ? "..." : "A/B"}
        </Label>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <p className="font-medium mb-1">A/B Testing</p>
              <p>
                Split participants between two question variants. Each participant
                sees only one variant (A or B) based on the split percentage you set.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Controls - only visible when enabled */}
      {isEnabled && (
        <>
          {/* Scope dropdown with tooltip */}
          <div className="flex items-center gap-1">
            <Select value={scopeValue} onValueChange={handleScopeChange}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="question_only">Question only</SelectItem>
                <SelectItem value="question_notes">Question + Notes</SelectItem>
                {isChoiceType && (
                  <>
                    <SelectItem value="question_options">Question + Options</SelectItem>
                    <SelectItem value="everything">Everything</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p className="font-medium mb-1">What to A/B test</p>
                  <ul className="space-y-1 list-disc pl-3">
                    <li>
                      <span className="font-medium">Question only:</span> Test different question text
                    </li>
                    <li>
                      <span className="font-medium">+ Notes:</span> Also vary the description
                    </li>
                    {isChoiceType && (
                      <li>
                        <span className="font-medium">+ Options:</span> Also vary the answer choices
                      </li>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Split percentage inputs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-purple-600">A:</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={splitValue}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                onSplitValueChange(val)
              }}
              onBlur={() => onSplitCommit(splitValue)}
              className="h-7 w-14 text-xs text-center px-1"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <span className="text-xs font-medium text-orange-500 ml-1">B:</span>
            <span className="text-xs text-muted-foreground">{100 - splitValue}%</span>
          </div>
        </>
      )}
    </div>
  )
}
export function ABTestVariantEditors({
  questionId,
  studyId,
  variantAContent,
  variantBContent,
  onVariantATextChange,
  onVariantBTextChange,
  enablePiping = false,
  availableQuestions = [],
  fallbackContent,
}: ABTestVariantEditorsProps) {
  // Check if Yjs is available for collaborative editing
  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected)
  const RefineWrapper = useRichTextRefine()

  // Use variantAContent if available, otherwise use fallback (for initial enable)
  const variantAText = variantAContent.question_text_html || fallbackContent || ''

  const renderVariantA = (slots?: RefineSlots) => {
    if (isCollaborative) {
      return (
        <CollaborativeEditor
          fieldPath={`question.${questionId}.abTest.variantA`}
          onChange={onVariantATextChange}
          initialContent={variantAText}
          placeholder="Enter variant A question text..."
          minHeight="80px"
          studyId={studyId}
          trailingSlot={slots?.trailingSlot}
          overlaySlot={slots?.overlaySlot}
          onEditorCreated={slots?.onEditorCreated}
        />
      )
    }
    return (
      <RichTextEditor
        content={variantAText}
        onChange={onVariantATextChange}
        placeholder="Enter variant A question text..."
        minHeight="80px"
        enablePiping={enablePiping}
        availableQuestions={availableQuestions}
        trailingSlot={slots?.trailingSlot}
        overlaySlot={slots?.overlaySlot}
        onEditorCreated={slots?.onEditorCreated}
      />
    )
  }

  const renderVariantB = (slots?: RefineSlots) => {
    if (isCollaborative) {
      return (
        <CollaborativeEditor
          fieldPath={`question.${questionId}.abTest.variantB`}
          onChange={onVariantBTextChange}
          initialContent={variantBContent.question_text_html || ''}
          placeholder="Enter variant B question text..."
          minHeight="80px"
          studyId={studyId}
          trailingSlot={slots?.trailingSlot}
          overlaySlot={slots?.overlaySlot}
          onEditorCreated={slots?.onEditorCreated}
        />
      )
    }
    return (
      <RichTextEditor
        content={variantBContent.question_text_html || ''}
        onChange={onVariantBTextChange}
        placeholder="Enter variant B question text..."
        minHeight="80px"
        enablePiping={enablePiping}
        availableQuestions={availableQuestions}
        trailingSlot={slots?.trailingSlot}
        overlaySlot={slots?.overlaySlot}
        onEditorCreated={slots?.onEditorCreated}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Variant A - purple accent */}
      <div className="border-l-4 border-l-purple-500 pl-3">
        {RefineWrapper ? <RefineWrapper>{(slots) => renderVariantA(slots)}</RefineWrapper> : renderVariantA()}
      </div>
      {/* Variant B - orange accent */}
      <div className="border-l-4 border-l-orange-500 pl-3">
        {RefineWrapper ? <RefineWrapper>{(slots) => renderVariantB(slots)}</RefineWrapper> : renderVariantB()}
      </div>
    </div>
  )
}
export function ABTestDescriptionSection({
  questionId,
  isEnabled,
  includeDescription,
  variantAContent,
  variantBContent,
  onVariantADescriptionChange,
  onVariantBDescriptionChange,
  description,
  onDescriptionChange,
  availableQuestions = [],
}: ABTestDescriptionSectionProps) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const variantARef = useRef<HTMLTextAreaElement>(null)
  const variantBRef = useRef<HTMLTextAreaElement>(null)

  // Check if Yjs is available for collaborative editing
  const yjs = useYjsOptional()
  const isCollaborative = !!(yjs?.doc && yjs?.provider && yjs?.isConnected)

  const hasPipingQuestions = availableQuestions.length > 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">Add notes</Label>
        {/* Show piping button for normal mode only (A/B mode has per-variant buttons) */}
        {!isEnabled && hasPipingQuestions && (
          <DescriptionPipingInsert
            textareaRef={descriptionRef}
            value={description || ''}
            onChange={(value) => onDescriptionChange(value || null)}
            availableQuestions={availableQuestions}
          />
        )}
      </div>
      {isEnabled && includeDescription ? (
        // A/B Mode: Two description textareas with per-variant piping
        <div className="space-y-2">
          <div className="border-l-4 border-l-purple-500 pl-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-purple-600 font-medium">Variant A</span>
              {hasPipingQuestions && !isCollaborative && (
                <DescriptionPipingInsert
                  textareaRef={variantARef}
                  value={variantAContent.description || ''}
                  onChange={onVariantADescriptionChange}
                  availableQuestions={availableQuestions}
                />
              )}
            </div>
            {isCollaborative ? (
              <CollaborativeTextarea
                fieldPath={`question.${questionId}.abTest.variantA.description`}
                onChange={onVariantADescriptionChange}
                initialValue={variantAContent.description || ''}
                placeholder="Variant A notes..."
                rows={2}
                className="resize-none text-sm"
              />
            ) : (
              <Textarea
                ref={variantARef}
                value={variantAContent.description || ''}
                onChange={(e) => onVariantADescriptionChange(e.target.value)}
                placeholder="Variant A notes..."
                rows={2}
                className="resize-none text-sm"
              />
            )}
          </div>
          <div className="border-l-4 border-l-orange-500 pl-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-orange-600 font-medium">Variant B</span>
              {hasPipingQuestions && !isCollaborative && (
                <DescriptionPipingInsert
                  textareaRef={variantBRef}
                  value={variantBContent.description || ''}
                  onChange={onVariantBDescriptionChange}
                  availableQuestions={availableQuestions}
                />
              )}
            </div>
            {isCollaborative ? (
              <CollaborativeTextarea
                fieldPath={`question.${questionId}.abTest.variantB.description`}
                onChange={onVariantBDescriptionChange}
                initialValue={variantBContent.description || ''}
                placeholder="Variant B notes..."
                rows={2}
                className="resize-none text-sm"
              />
            ) : (
              <Textarea
                ref={variantBRef}
                value={variantBContent.description || ''}
                onChange={(e) => onVariantBDescriptionChange(e.target.value)}
                placeholder="Variant B notes..."
                rows={2}
                className="resize-none text-sm"
              />
            )}
          </div>
        </div>
      ) : (
        // Normal mode: Single textarea
        isCollaborative ? (
          <CollaborativeTextarea
            fieldPath={`question.${questionId}.description`}
            onChange={(value) => onDescriptionChange(value || null)}
            initialValue={description || ''}
            placeholder="Type extra details here. This is optional."
            rows={2}
            className="resize-none text-sm"
          />
        ) : (
          <Textarea
            ref={descriptionRef}
            value={description || ''}
            onChange={(e) => onDescriptionChange(e.target.value || null)}
            placeholder="Type extra details here. This is optional."
            rows={2}
            className="resize-none text-sm"
          />
        )
      )}
    </div>
  )
}
