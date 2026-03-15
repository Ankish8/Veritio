'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ExternalLink, Info, Route, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { AiRefineMenuButton } from '@/components/ai-refine'
import type { Editor } from '@tiptap/react'
import { UrlPathRecorder } from '../url-path-recorder'
import { UrlPathPreview } from '../url-path-preview'
import { GenericPostTaskQuestionsModal } from '@/components/builders/shared/post-task-questions-modal'
import { PerVariantConfigPanel } from './per-variant-config-panel'
import type { LiveWebsiteTask, LiveWebsiteVariant, LiveWebsiteTaskVariant } from '@/stores/study-builder'
import type { UrlSuccessPath } from '@/stores/study-builder/live-website-builder'
import type { PostTaskQuestion } from '@veritio/study-types'

const RichTextEditor = dynamic(
  () => import('@/components/study-flow/builder/rich-text-editor').then((m) => ({ default: m.RichTextEditor })),
  { ssr: false, loading: () => <div className="h-[80px] animate-pulse rounded-md bg-muted" /> }
)

const CRITERIA_DESCRIPTIONS: Record<string, string> = {
  self_reported: 'Participants click a "Mark as complete" button when they feel done.',
  url_match: 'The task auto-completes when the participant navigates to the success URL. Use wildcard patterns like /checkout/* for flexible matching.',
  exact_path: 'Record the exact sequence of pages and clicks the participant must follow.',
}

function getCriteriaDescription(type: string): string {
  return CRITERIA_DESCRIPTIONS[type] ?? ''
}

export interface TaskCardContentProps {
  task: LiveWebsiteTask
  tasks: LiveWebsiteTask[]
  taskNumber: number
  studyId: string
  websiteUrl: string
  baseUrl: string
  supportsUrlPath: boolean
  trackingMode: 'snippet' | 'reverse_proxy' | 'url_only'
  snippetId: string | null
  abTestingEnabled: boolean
  variants: LiveWebsiteVariant[]
  taskVariants: LiveWebsiteTaskVariant[]
  activeVariantTab: string | null
  onTabChange: (id: string) => void
  postTaskQuestions: PostTaskQuestion[]
  recorderOpen: boolean
  setRecorderOpen: (open: boolean) => void
  variantRecorderVariantId: string | null
  setVariantRecorderVariantId: (id: string | null) => void
  postTaskQuestionsOpen: boolean
  setPostTaskQuestionsOpen: (open: boolean) => void
  onUpdate: (updates: Partial<LiveWebsiteTask>) => void
  onDelete: () => void
  onSetTaskVariantCriteria: (taskId: string, variantId: string, criteria: Partial<LiveWebsiteTaskVariant>) => void
  handleCriteriaChange: (value: string) => void
  handleSavePath: (path: UrlSuccessPath) => void
  getPathFromTargetUrl: (url: string) => string
  postTaskActions: {
    addPostTaskQuestion: (taskId: string, question: Omit<PostTaskQuestion, 'id' | 'position'>) => void
    updatePostTaskQuestion: (taskId: string, questionId: string, updates: Partial<PostTaskQuestion>) => void
    removePostTaskQuestion: (taskId: string, questionId: string) => void
    reorderPostTaskQuestions: (taskId: string, questions: PostTaskQuestion[]) => void
  }
}

export function TaskCardContent({
  task,
  tasks,
  taskNumber,
  studyId,
  websiteUrl,
  baseUrl,
  supportsUrlPath,
  trackingMode,
  snippetId,
  abTestingEnabled,
  variants,
  taskVariants,
  activeVariantTab,
  onTabChange,
  postTaskQuestions,
  recorderOpen,
  setRecorderOpen,
  variantRecorderVariantId,
  setVariantRecorderVariantId,
  postTaskQuestionsOpen,
  setPostTaskQuestionsOpen,
  onUpdate,
  onDelete,
  onSetTaskVariantCriteria,
  handleCriteriaChange,
  handleSavePath,
  getPathFromTargetUrl,
  postTaskActions,
}: TaskCardContentProps) {
  return (
    <>
      <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t">
        <div className="pt-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor={`task-title-${task.id}`}>Title</Label>
            <Input
              id={`task-title-${task.id}`}
              placeholder="e.g., Find the pricing page"
              value={task.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
            />
          </div>

          {/* Starting Page — only shown in non-A/B mode */}
          {!abTestingEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor={`task-url-${task.id}`}>Starting Page</Label>
              <div className="flex gap-2">
                {baseUrl ? (
                  <div className="flex flex-1 items-stretch">
                    <span
                      className="inline-flex items-center px-3 text-sm text-muted-foreground whitespace-nowrap select-none shrink-0"
                      style={{
                        height: '2.75rem',
                        backgroundColor: 'var(--style-input-bg, var(--muted))',
                        border: '1px solid var(--style-input-border, var(--border))',
                        borderRight: 'none',
                        borderRadius: 'var(--style-radius, var(--radius)) 0 0 var(--style-radius, var(--radius))',
                      }}
                    >
                      {baseUrl}
                    </span>
                    <Input
                      id={`task-url-${task.id}`}
                      placeholder="Leave empty for homepage"
                      value={getPathFromTargetUrl(task.target_url)}
                      onChange={(e) => {
                        const path = e.target.value
                        onUpdate({ target_url: path ? `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}` : '' })
                      }}
                      className="flex-1"
                      style={{ borderRadius: `0 var(--style-radius, var(--radius)) var(--style-radius, var(--radius)) 0` }}
                    />
                  </div>
                ) : (
                  <Input
                    id={`task-url-${task.id}`}
                    type="url"
                    placeholder="https://example.com/page"
                    value={task.target_url}
                    onChange={(e) => onUpdate({ target_url: e.target.value })}
                    className="flex-1"
                  />
                )}
                {task.target_url && (
                  <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                    <a href={task.target_url} target="_blank" rel="noopener noreferrer" aria-label="Open starting page">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label id={`task-instructions-label-${task.id}`}>Instructions</Label>
            <RichTextEditor
              content={task.instructions}
              onChange={(html) => onUpdate({ instructions: html })}
              placeholder={supportsUrlPath
                ? 'Describe the goal. Use success criteria below to auto-detect when participants complete the task.'
                : 'Describe what the participant should try to accomplish...'}
              minHeight="80px"
              aria-labelledby={`task-instructions-label-${task.id}`}
              trailingSlot={(editor: Editor) => (
                <AiRefineMenuButton editor={editor} context="Task instructions for a live website usability test" />
              )}
            />
          </div>

          {!supportsUrlPath && (
            <div className="flex gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Switch to <span className="font-medium text-foreground">Automatic Tracking</span> or{' '}
                <span className="font-medium text-foreground">Code Install</span> in the Website tab to
                enable URL-based success detection, click tracking, and scroll depth.
              </p>
            </div>
          )}

          {/* ── Per-Variant Configuration (A/B mode) ── */}
          {abTestingEnabled && variants && variants.length > 0 && (
            <PerVariantConfigPanel
              task={task}
              variants={variants}
              taskVariants={taskVariants}
              activeVariantTab={activeVariantTab}
              onTabChange={onTabChange}
              supportsUrlPath={supportsUrlPath}
              onSetTaskVariantCriteria={onSetTaskVariantCriteria}
              onOpenVariantRecorder={setVariantRecorderVariantId}
            />
          )}

          {/* Success Criteria — non-A/B mode */}
          {supportsUrlPath && !abTestingEnabled && (
            <div className="space-y-2">
              <Label>Success Criteria</Label>
              <RadioGroup value={task.success_criteria_type} onValueChange={handleCriteriaChange}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="self_reported" id={`self-reported-${task.id}`} />
                  <Label htmlFor={`self-reported-${task.id}`} className="font-normal">
                    Participant marks task as complete
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="url_match" id={`url-match-${task.id}`} />
                  <Label htmlFor={`url-match-${task.id}`} className="font-normal">
                    Auto-detect when participant reaches a URL
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="exact_path" id={`exact-path-${task.id}`} />
                  <Label htmlFor={`exact-path-${task.id}`} className="font-normal">
                    Participant must follow a specific navigation sequence
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {getCriteriaDescription(task.success_criteria_type)}
              </p>
            </div>
          )}

          {!abTestingEnabled && task.success_criteria_type === 'url_match' && (
            <div className="space-y-1.5">
              <Label htmlFor={`success-url-${task.id}`}>Success URL</Label>
              <div className="flex gap-2">
                {baseUrl ? (
                  <div className="flex flex-1 items-stretch">
                    <span
                      className="inline-flex items-center px-3 text-sm text-muted-foreground whitespace-nowrap select-none shrink-0"
                      style={{
                        height: '2.75rem',
                        backgroundColor: 'var(--style-input-bg, var(--muted))',
                        border: '1px solid var(--style-input-border, var(--border))',
                        borderRight: 'none',
                        borderRadius: 'var(--style-radius, var(--radius)) 0 0 var(--style-radius, var(--radius))',
                      }}
                    >
                      {baseUrl}
                    </span>
                    <Input
                      id={`success-url-${task.id}`}
                      placeholder="/checkout/complete or /thank-you*"
                      value={task.success_url ? getPathFromTargetUrl(task.success_url) : ''}
                      onChange={(e) => {
                        const path = e.target.value
                        onUpdate({ success_url: path ? `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}` : null })
                      }}
                      className="flex-1"
                      style={{ borderRadius: `0 var(--style-radius, var(--radius)) var(--style-radius, var(--radius)) 0` }}
                    />
                  </div>
                ) : (
                  <Input
                    id={`success-url-${task.id}`}
                    type="url"
                    placeholder="https://example.com/success-page"
                    value={task.success_url ?? ''}
                    onChange={(e) => onUpdate({ success_url: e.target.value || null })}
                    className="flex-1"
                  />
                )}
                {task.success_url && (
                  <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                    <a href={task.success_url} target="_blank" rel="noopener noreferrer" aria-label="Verify success URL">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The task auto-completes when the participant reaches this URL. Use * as a wildcard for flexible matching.
              </p>
            </div>
          )}

          {!abTestingEnabled && task.success_criteria_type === 'exact_path' && (
            <div className="space-y-2">
              {task.success_path ? (
                <UrlPathPreview path={task.success_path} onEdit={() => setRecorderOpen(true)} onUpdate={handleSavePath} />
              ) : (
                <Button variant="outline" onClick={() => setRecorderOpen(true)} disabled={!task.target_url && !websiteUrl}>
                  <Route className="h-4 w-4 mr-2" />
                  Record Path
                </Button>
              )}
              {!task.target_url && !websiteUrl && (
                <p className="text-xs text-muted-foreground">Set a starting page or website URL first.</p>
              )}
            </div>
          )}

          {/* Time Limit Override — non-A/B mode only (in A/B mode it lives inside the variant box) */}
          {!abTestingEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor={`time-limit-${task.id}`}>Time limit override (seconds)</Label>
              <Input
                id={`time-limit-${task.id}`}
                type="number"
                min={0}
                placeholder="Use default"
                value={task.time_limit_seconds ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  onUpdate({ time_limit_seconds: val ? parseInt(val, 10) : null })
                }}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Leave empty to use the global default time limit.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <Label>Post-task Questions</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ask participants questions after they complete this task
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPostTaskQuestionsOpen(true)}>
                {postTaskQuestions.length > 0 ? 'Edit Questions' : 'Add Questions'}
                {postTaskQuestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{postTaskQuestions.length}</Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete task
            </Button>
          </div>
        </div>
      </CardContent>

      <UrlPathRecorder
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        websiteUrl={websiteUrl}
        startUrl={task.target_url || undefined}
        initialPath={task.success_path}
        onSave={handleSavePath}
        trackingMode={trackingMode}
        studyId={studyId}
        snippetId={snippetId}
      />

      {/* Per-variant path recorder */}
      {variantRecorderVariantId && (() => {
        const v = variants?.find(v => v.id === variantRecorderVariantId)
        const tv = taskVariants?.find(tv => tv.variant_id === variantRecorderVariantId)
        if (!v) return null
        return (
          <UrlPathRecorder
            open={true}
            onOpenChange={(open) => { if (!open) setVariantRecorderVariantId(null) }}
            websiteUrl={v.url || websiteUrl}
            startUrl={tv?.starting_url || v.url || task.target_url || undefined}
            initialPath={(tv?.success_path as UrlSuccessPath | null) ?? null}
            onSave={(path) => {
              onSetTaskVariantCriteria(task.id, v.id, { success_path: path as any })
              setVariantRecorderVariantId(null)
            }}
            trackingMode={trackingMode}
            studyId={studyId}
            snippetId={snippetId}
          />
        )
      })()}

      <GenericPostTaskQuestionsModal
        open={postTaskQuestionsOpen}
        onOpenChange={setPostTaskQuestionsOpen}
        taskId={task.id}
        taskNumber={taskNumber}
        studyId={studyId}
        tasks={tasks}
        actions={postTaskActions}
        excludeQuestionTypes={['audio_response']}
      />
    </>
  )
}
