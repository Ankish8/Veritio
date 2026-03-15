import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ExternalLink, Route } from 'lucide-react'
import { UrlPathPreview } from '../url-path-preview'
import type {
  LiveWebsiteTask,
  LiveWebsiteVariant,
  LiveWebsiteTaskVariant,
} from '@/stores/study-builder'
import type { UrlSuccessPath } from '@/stores/study-builder/live-website-builder'

interface PerVariantConfigPanelProps {
  task: LiveWebsiteTask
  variants: LiveWebsiteVariant[]
  taskVariants: LiveWebsiteTaskVariant[]
  activeVariantTab: string | null
  onTabChange: (id: string) => void
  supportsUrlPath: boolean
  onSetTaskVariantCriteria: (taskId: string, variantId: string, criteria: Partial<LiveWebsiteTaskVariant>) => void
  onOpenVariantRecorder: (variantId: string) => void
}

export function PerVariantConfigPanel({
  task,
  variants,
  taskVariants,
  activeVariantTab,
  onTabChange,
  supportsUrlPath,
  onSetTaskVariantCriteria,
  onOpenVariantRecorder,
}: PerVariantConfigPanelProps) {
  return (
    <div className="rounded-md border bg-muted/20 overflow-hidden">
      {/* Header + tabs */}
      <div className="px-3 pt-3 pb-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Per-Variant Configuration
        </p>
        <div className="flex gap-1 border-b">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onTabChange(v.id)}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                activeVariantTab === v.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Variant {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active variant panel */}
      {variants.map((v) => {
        if (activeVariantTab !== v.id) return null
        const tv = taskVariants?.find(tv => tv.variant_id === v.id)
        const startingUrl = tv?.starting_url ?? ''
        const criteriaType = tv?.success_criteria_type || 'self_reported'
        const successUrl = tv?.success_url || null
        const successPath = tv?.success_path || null
        const timeLimitSeconds = tv?.time_limit_seconds ?? null
        const variantBaseUrl = v.url
          ? (() => { try { return new URL(v.url.startsWith('http') ? v.url : `https://${v.url}`).origin } catch { return '' } })()
          : ''

        const getPathFromUrl = (url: string) => {
          if (!url) return ''
          if (url.startsWith(variantBaseUrl)) return url.slice(variantBaseUrl.length)
          try { const u = new URL(url); return u.pathname + u.search + u.hash } catch { return url }
        }

        return (
          <div key={v.id} className="px-3 py-3 space-y-4">
            {/* Starting Page */}
            <div className="space-y-1.5">
              <Label htmlFor={`tv-url-${task.id}-${v.id}`}>Starting Page</Label>
              <div className="flex gap-2">
                {variantBaseUrl ? (
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
                      {variantBaseUrl}
                    </span>
                    <Input
                      id={`tv-url-${task.id}-${v.id}`}
                      placeholder="Leave empty for homepage"
                      value={getPathFromUrl(startingUrl)}
                      onChange={(e) => {
                        const path = e.target.value
                        onSetTaskVariantCriteria(task.id, v.id, {
                          starting_url: path ? `${variantBaseUrl}${path.startsWith('/') ? '' : '/'}${path}` : null,
                        })
                      }}
                      className="flex-1"
                      style={{ borderRadius: `0 var(--style-radius, var(--radius)) var(--style-radius, var(--radius)) 0` }}
                    />
                  </div>
                ) : (
                  <Input
                    id={`tv-url-${task.id}-${v.id}`}
                    type="url"
                    placeholder="https://example.com/page"
                    value={startingUrl}
                    onChange={(e) => onSetTaskVariantCriteria(task.id, v.id, { starting_url: e.target.value || null })}
                    className="flex-1"
                  />
                )}
                {startingUrl && (
                  <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                    <a href={startingUrl} target="_blank" rel="noopener noreferrer" aria-label="Open starting page">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              {!v.url && (
                <p className="text-xs text-muted-foreground">Set a website URL for this variant in the Website tab first.</p>
              )}
            </div>

            {/* Success Criteria */}
            {supportsUrlPath && (
              <div className="space-y-2">
                <Label>Success Criteria</Label>
                <RadioGroup
                  value={criteriaType}
                  onValueChange={(val) => onSetTaskVariantCriteria(task.id, v.id, { success_criteria_type: val as any })}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="self_reported" id={`v-self-${task.id}-${v.id}`} />
                    <Label htmlFor={`v-self-${task.id}-${v.id}`} className="font-normal">Participant marks complete</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="url_match" id={`v-url-${task.id}-${v.id}`} />
                    <Label htmlFor={`v-url-${task.id}-${v.id}`} className="font-normal">Auto-detect by URL</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="exact_path" id={`v-path-${task.id}-${v.id}`} />
                    <Label htmlFor={`v-path-${task.id}-${v.id}`} className="font-normal">Specific navigation sequence</Label>
                  </div>
                </RadioGroup>
                {criteriaType === 'url_match' && (
                  <Input
                    placeholder={variantBaseUrl ? `${variantBaseUrl}/success*` : 'https://example.com/success'}
                    value={successUrl ?? ''}
                    onChange={(e) => onSetTaskVariantCriteria(task.id, v.id, { success_url: e.target.value || null })}
                  />
                )}
                {criteriaType === 'exact_path' && (
                  <div className="space-y-2">
                    {successPath ? (
                      <UrlPathPreview
                        path={successPath as UrlSuccessPath}
                        onEdit={() => onOpenVariantRecorder(v.id)}
                        onUpdate={(path) => onSetTaskVariantCriteria(task.id, v.id, { success_path: path as any })}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => onOpenVariantRecorder(v.id)}
                        disabled={!startingUrl && !v.url}
                      >
                        <Route className="h-4 w-4 mr-2" />
                        Record Path
                      </Button>
                    )}
                    {!startingUrl && !v.url && (
                      <p className="text-xs text-muted-foreground">Set a starting page for this variant first.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Time Limit Override */}
            <div className="space-y-1.5">
              <Label htmlFor={`tv-time-${task.id}-${v.id}`}>Time limit override (seconds)</Label>
              <Input
                id={`tv-time-${task.id}-${v.id}`}
                type="number"
                min={0}
                placeholder="Use default"
                value={timeLimitSeconds ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  onSetTaskVariantCriteria(task.id, v.id, {
                    time_limit_seconds: val ? parseInt(val, 10) : null,
                  })
                }}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Leave empty to use the global default time limit.</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
