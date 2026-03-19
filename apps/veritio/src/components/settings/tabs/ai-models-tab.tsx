'use client'

import { useState, useCallback } from 'react'
import { useUserPreferences } from '@/hooks'
import { useAiModelsList } from '@/hooks/use-ai-models-list'
import type { AiProviderConfigUpdate, UserAiConfigUpdate } from '@/lib/supabase/user-preferences-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, RefreshCw, Save, Eye, EyeOff } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

interface ProviderDraft {
  apiKey: string
  baseUrl: string
  model: string
  hasExistingKey: boolean
}

function createDraftFromPrefs(
  config: { apiKeyMasked: string | null; hasApiKey: boolean; baseUrl: string | null; model: string | null } | undefined,
): ProviderDraft {
  return {
    apiKey: '',
    baseUrl: config?.baseUrl ?? '',
    model: config?.model ?? '',
    hasExistingKey: config?.hasApiKey ?? false,
  }
}

interface ProviderSectionProps {
  title: string
  description: string
  draft: ProviderDraft
  onDraftChange: (updates: Partial<ProviderDraft>) => void
  models: string[]
  isRefreshing: boolean
  onRefreshModels: () => void
}

function ProviderSection({
  title,
  description,
  draft,
  onDraftChange,
  models,
  isRefreshing,
  onRefreshModels,
}: ProviderSectionProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder={draft.hasExistingKey ? 'Key saved — enter a new key to replace' : 'Enter API key'}
              value={draft.apiKey}
              onChange={(e) => onDraftChange({ apiKey: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {draft.hasExistingKey && !draft.apiKey && (
            <p className="text-xs text-muted-foreground">A key is already saved. Leave blank to keep it.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Base URL</Label>
          <Input
            type="url"
            placeholder="Leave blank for default endpoint"
            value={draft.baseUrl}
            onChange={(e) => onDraftChange({ baseUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Only change this if using a custom or self-hosted endpoint.</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Model</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshModels}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Refresh Models
            </Button>
          </div>

          {models.length > 0 ? (
            <Select
              value={draft.model}
              onValueChange={(value) => onDraftChange({ model: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder={draft.model || 'Click "Refresh Models" to load available models, or type a model ID'}
              value={draft.model}
              onChange={(e) => onDraftChange({ model: e.target.value })}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AiModelsTab() {
  const { preferences, isLoading, updateAiConfig } = useUserPreferences()
  const { modelsByProvider, loadingProvider, fetchModels, error: modelsError } = useAiModelsList()
  const [isSaving, setIsSaving] = useState(false)
  const [useSameProvider, setUseSameProvider] = useState<boolean | null>(null)

  const [openaiDraft, setOpenaiDraft] = useState<ProviderDraft | null>(null)
  const [mercuryDraft, setMercuryDraft] = useState<ProviderDraft | null>(null)

  // Initialize drafts from preferences (only once, when preferences load)
  const effectiveUseSameProvider = useSameProvider ?? preferences?.ai?.useSameProvider ?? false
  const effectiveOpenaiDraft = openaiDraft ?? createDraftFromPrefs(preferences?.ai?.openai)
  const effectiveMercuryDraft = mercuryDraft ?? createDraftFromPrefs(preferences?.ai?.mercury)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const update: UserAiConfigUpdate = {
        useSameProvider: effectiveUseSameProvider,
      }

      // OpenAI / primary provider
      const openaiUpdate: AiProviderConfigUpdate = {}
      if (effectiveOpenaiDraft.apiKey) openaiUpdate.apiKey = effectiveOpenaiDraft.apiKey
      if (effectiveOpenaiDraft.baseUrl !== (preferences?.ai?.openai?.baseUrl ?? '')) {
        openaiUpdate.baseUrl = effectiveOpenaiDraft.baseUrl || null
      }
      if (effectiveOpenaiDraft.model !== (preferences?.ai?.openai?.model ?? '')) {
        openaiUpdate.model = effectiveOpenaiDraft.model || null
      }
      if (Object.keys(openaiUpdate).length > 0) update.openai = openaiUpdate

      // Mercury / secondary provider (only if not using same provider)
      if (!effectiveUseSameProvider) {
        const mercuryUpdate: AiProviderConfigUpdate = {}
        if (effectiveMercuryDraft.apiKey) mercuryUpdate.apiKey = effectiveMercuryDraft.apiKey
        if (effectiveMercuryDraft.baseUrl !== (preferences?.ai?.mercury?.baseUrl ?? '')) {
          mercuryUpdate.baseUrl = effectiveMercuryDraft.baseUrl || null
        }
        if (effectiveMercuryDraft.model !== (preferences?.ai?.mercury?.model ?? '')) {
          mercuryUpdate.model = effectiveMercuryDraft.model || null
        }
        if (Object.keys(mercuryUpdate).length > 0) update.mercury = mercuryUpdate
      }

      await updateAiConfig(update)

      // Clear API key inputs after save (they're now stored server-side)
      setOpenaiDraft(prev => prev ? { ...prev, apiKey: '', hasExistingKey: prev.hasExistingKey || !!prev.apiKey } : prev)
      setMercuryDraft(prev => prev ? { ...prev, apiKey: '', hasExistingKey: prev.hasExistingKey || !!prev.apiKey } : prev)

      toast.success('AI model settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save AI settings')
    } finally {
      setIsSaving(false)
    }
  }, [effectiveUseSameProvider, effectiveOpenaiDraft, effectiveMercuryDraft, preferences, updateAiConfig])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI Models</h3>
        <p className="text-sm text-muted-foreground">
          Configure your own AI providers and models. If not configured, the platform defaults will be used.
        </p>
      </div>

      {/* Same provider toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Use same provider for both</Label>
              <p className="text-xs text-muted-foreground">
                Use a single AI provider and model for all features
              </p>
            </div>
            <Switch
              checked={effectiveUseSameProvider}
              onCheckedChange={(checked) => setUseSameProvider(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Primary provider: AI for Building & Analysis */}
      <ProviderSection
        title="AI for Building & Analysis"
        description="Used for study builders, insights reports, and suggestions"
        draft={effectiveOpenaiDraft}
        onDraftChange={(updates) => setOpenaiDraft({ ...effectiveOpenaiDraft, ...updates })}
        models={modelsByProvider['openai'] ?? []}
        isRefreshing={loadingProvider === 'openai'}
        onRefreshModels={() => fetchModels('openai')}
      />

      {/* Secondary provider: AI for Writing & Knowledge */}
      {!effectiveUseSameProvider && (
        <ProviderSection
          title="AI for Writing & Knowledge"
          description="Used for text refinement, knowledge Q&A, and title generation"
          draft={effectiveMercuryDraft}
          onDraftChange={(updates) => setMercuryDraft({ ...effectiveMercuryDraft, ...updates })}
          models={modelsByProvider['mercury'] ?? []}
          isRefreshing={loadingProvider === 'mercury'}
          onRefreshModels={() => fetchModels('mercury')}
        />
      )}

      {modelsError && (
        <p className="text-sm text-destructive">{modelsError}</p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
