'use client'

import { useState, useCallback, memo } from 'react'
import {
  GripVertical,
  Image as ImageIcon,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PresenceBadge, PresenceRing } from '@/components/yjs'
import { useCollaborativeField } from '@veritio/yjs'
import { cn } from '@/lib/utils'
import { useFirstImpressionActions, useFirstImpressionSettings, useFirstImpressionSharedQuestions } from '@/stores/study-builder'
import type { FirstImpressionDesign } from '@veritio/study-types/study-flow-types'
import { ImagePickerDialog } from './image-picker-dialog'
import { DesignQuestionsModal } from './design-questions-modal'

interface DesignCardProps {
  design: FirstImpressionDesign
  designNumber: number
  studyId: string
  onDelete: () => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
  /** Show A/B weight controls - only when 2+ designs exist */
  showWeightControls?: boolean
}

// Custom memo comparison for performance
function areDesignCardPropsEqual(prevProps: DesignCardProps, nextProps: DesignCardProps): boolean {
  if (prevProps.design.id !== nextProps.design.id) return false
  if (prevProps.design.name !== nextProps.design.name) return false
  if (prevProps.design.image_url !== nextProps.design.image_url) return false
  if (prevProps.design.weight !== nextProps.design.weight) return false
  if (prevProps.design.is_practice !== nextProps.design.is_practice) return false
  if (prevProps.design.questions?.length !== nextProps.design.questions?.length) return false
  // Compare updated_at to detect question content changes (config, text, etc.)
  if (prevProps.design.updated_at !== nextProps.design.updated_at) return false
  if (prevProps.designNumber !== nextProps.designNumber) return false
  if (prevProps.isDragging !== nextProps.isDragging) return false
  if (prevProps.showWeightControls !== nextProps.showWeightControls) return false
  return true
}

export const DesignCard = memo(function DesignCard({
  design,
  designNumber,
  studyId,
  onDelete,
  dragHandleProps,
  isDragging = false,
  showWeightControls = false,
}: DesignCardProps) {
  const { updateDesign, setDesignImage, setDesignWeight, setDesignPractice } =
    useFirstImpressionActions()
  const settings = useFirstImpressionSettings()
  const sharedQuestions = useFirstImpressionSharedQuestions()
  const questionMode = settings.questionMode ?? 'shared'
  const isSharedMode = questionMode === 'shared'

  // Collaborative presence
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:first-impression-design:${design.id}`,
  })

  // UI states
  const [isExpanded, setIsExpanded] = useState(true)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [questionsModalOpen, setQuestionsModalOpen] = useState(false)

  // Local state for name (blur-to-save pattern)
  const [localName, setLocalName] = useState(design.name || '')

  const handleNameBlur = useCallback(() => {
    if (localName !== design.name) {
      updateDesign(design.id, { name: localName || null })
    }
  }, [localName, design.name, design.id, updateDesign])

  const handleWeightChange = useCallback(
    (value: number[]) => {
      setDesignWeight(design.id, value[0])
    },
    [design.id, setDesignWeight]
  )

  const handlePracticeToggle = useCallback(
    (checked: boolean) => {
      setDesignPractice(design.id, checked)
      // Auto-save will handle persistence (500ms delay)
    },
    [design.id, setDesignPractice]
  )

  // Get display name
  const displayName = design.name || `Design ${designNumber}`
  const questionCount = design.questions?.length || 0

  return (
    <>
      <div
        className={cn(
          'relative border rounded-lg bg-card',
          isDragging && 'opacity-50 ring-2 ring-primary',
          design.is_practice && 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
        )}
        {...wrapperProps}
      >
        {/* Collaborative presence indicators */}
        {hasPresence && primaryUser && (
          <>
            <PresenceRing color={primaryUser.color} className="rounded-lg" />
            <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" />
          </>
        )}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            {/* Drag handle */}
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            {/* Design number */}
            <span className="flex-shrink-0 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              {designNumber}
            </span>

            {/* Name preview */}
            <span className="flex-1 text-sm font-medium truncate text-foreground">
              {displayName}
            </span>

            {/* Practice badge */}
            {design.is_practice && (
              <Badge variant="outline" className="h-5 text-xs font-normal border-amber-500/50 text-amber-700 dark:text-amber-400">
                <FlaskConical className="h-3 w-3 mr-1" />
                Practice
              </Badge>
            )}

            {/* Weight badge - only shown for A/B testing (2+ designs) */}
            {!design.is_practice && showWeightControls && (
              <Badge variant="outline" className="h-5 text-xs font-normal border-border/50">
                {design.weight}%
              </Badge>
            )}

            {/* Question count badge */}
            {questionCount > 0 && (
              <Badge variant="outline" className="h-5 text-xs font-normal border-border/50">
                <MessageSquare className="h-3 w-3 mr-1" />
                {questionCount}
              </Badge>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <CollapsibleContent>
            <div className="p-5">
              <div className="flex gap-5">
                {/* Image */}
                <div className="flex-shrink-0">
                  {design.image_url ? (
                    <button
                      onClick={() => setImagePickerOpen(true)}
                      className="relative group w-[260px] h-[160px] rounded-lg border hover:border-primary transition-colors overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={design.image_url}
                        alt={design.original_filename || 'Design image'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Change</span>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => setImagePickerOpen(true)}
                      className="w-[260px] h-[160px] rounded-lg border border-dashed border-muted-foreground/25 hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Choose image</span>
                    </button>
                  )}
                </div>

                {/* Settings */}
                <div className="flex-1 space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Design Name</Label>
                    <Input
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      onBlur={handleNameBlur}
                      placeholder={`Design ${designNumber}`}
                    />
                  </div>

                  {/* Weight Slider - only show for A/B testing (2+ non-practice designs) */}
                  {!design.is_practice && showWeightControls && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">A/B Test Weight</Label>
                        <span className="text-sm text-muted-foreground">{design.weight}%</span>
                      </div>
                      <Slider
                        value={[design.weight]}
                        onValueChange={handleWeightChange}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher weight = more likely to be shown to participants
                      </p>
                    </div>
                  )}

                  {/* Practice Toggle - Only shown for the first design (position 0) */}
                  {design.position === 0 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Practice Round</Label>
                        <p className="text-xs text-muted-foreground">
                          Show this design first as a warm-up (not included in results)
                        </p>
                      </div>
                      <Switch
                        checked={design.is_practice}
                        onCheckedChange={handlePracticeToggle}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Questions section - hidden for practice designs */}
              {!design.is_practice && (
                <div className="mt-6 pt-5 border-t border-border/50">
                  {isSharedMode ? (
                    /* Shared mode: informational note */
                    sharedQuestions.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Shared questions ({sharedQuestions.length}) &mdash; configured in settings panel
                        </span>
                      </div>
                    )
                  ) : (
                    /* Per-design mode: edit button */
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Per-Design Questions</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ask participants questions after viewing this design
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuestionsModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {questionCount > 0 ? 'Edit Questions' : 'Add Questions'}
                        {questionCount > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {questionCount}
                          </Badge>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Image Picker Dialog */}
      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        studyId={studyId}
        designId={design.id}
        currentImage={design.image_url ? {
          image_url: design.image_url,
          original_filename: design.original_filename,
          width: design.width,
          height: design.height,
          source_type: design.source_type,
        } : null}
        onImageSelected={(image) => {
          setDesignImage(design.id, image)
          setImagePickerOpen(false)
        }}
      />

      {/* Per-Design Questions Modal - only in per-design mode */}
      {!isSharedMode && (
        <DesignQuestionsModal
          open={questionsModalOpen}
          onOpenChange={setQuestionsModalOpen}
          design={design}
          designNumber={designNumber}
          studyId={studyId}
          mode="per_design"
        />
      )}
    </>
  )
}, areDesignCardPropsEqual)
