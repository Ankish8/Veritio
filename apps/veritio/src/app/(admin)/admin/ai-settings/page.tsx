'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { AdminErrorState } from '@/components/admin/shared/admin-error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, Eye, EyeOff } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { getAuthFetchInstance } from '@/lib/swr'

interface ProviderConfig {
  apiKeyMasked: string | null
  hasApiKey: boolean
  baseUrl: string | null
  model: string | null
  dailyLimit: number
}

interface AdminAiConfig {
  openai: ProviderConfig
  mercury: ProviderConfig
  updatedAt: string | null
}

interface ProviderDraft {
  apiKey: string
  baseUrl: string
  model: string
  dailyLimit: number
  hasExistingKey: boolean
}

function createDraft(config: ProviderConfig): ProviderDraft {
  return {
    apiKey: '',
    baseUrl: config.baseUrl ?? '',
    model: config.model ?? '',
    dailyLimit: config.dailyLimit,
    hasExistingKey: config.hasApiKey,
  }
}

interface ProviderSectionProps {
  title: string
  description: string
  draft: ProviderDraft
  onDraftChange: (updates: Partial<ProviderDraft>) => void
}

function ProviderSection({ title, description, draft, onDraftChange }: ProviderSectionProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Platform API Key</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder={draft.hasExistingKey ? 'Key saved — enter a new key to replace' : 'Enter platform API key'}
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
            <p className="text-xs text-muted-foreground">A platform key is already saved. Leave blank to keep it.</p>
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
        </div>

        <div className="space-y-2">
          <Label>Default Model</Label>
          <Input
            placeholder="e.g. gpt-5-mini, mercury-2"
            value={draft.model}
            onChange={(e) => onDraftChange({ model: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            The default model used when users haven't configured their own. Falls back to env var if empty.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Daily Credit Limit</Label>
          <Input
            type="number"
            min={0}
            max={100000}
            value={draft.dailyLimit}
            onChange={(e) => onDraftChange({ dailyLimit: parseInt(e.target.value, 10) || 0 })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum AI messages per user per day for this provider. Set to 0 to disable.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminAiSettingsPage() {
  const { data, error, isLoading, mutate } = useSWR<AdminAiConfig>(
    '/api/admin/ai-config',
    { refreshInterval: 60000 }
  )

  const [openaiDraft, setOpenaiDraft] = useState<ProviderDraft | null>(null)
  const [mercuryDraft, setMercuryDraft] = useState<ProviderDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize drafts when data loads
  useEffect(() => {
    if (data && !openaiDraft) setOpenaiDraft(createDraft(data.openai))
    if (data && !mercuryDraft) setMercuryDraft(createDraft(data.mercury))
  }, [data, openaiDraft, mercuryDraft])

  const handleSave = useCallback(async () => {
    if (!openaiDraft || !mercuryDraft) return
    setIsSaving(true)
    try {
      const authFetch = getAuthFetchInstance()
      const body: Record<string, Record<string, unknown>> = { openai: {}, mercury: {} }

      // OpenAI provider
      if (openaiDraft.apiKey) body.openai.apiKey = openaiDraft.apiKey
      body.openai.baseUrl = openaiDraft.baseUrl || null
      body.openai.model = openaiDraft.model || null
      body.openai.dailyLimit = openaiDraft.dailyLimit

      // Mercury provider
      if (mercuryDraft.apiKey) body.mercury.apiKey = mercuryDraft.apiKey
      body.mercury.baseUrl = mercuryDraft.baseUrl || null
      body.mercury.model = mercuryDraft.model || null
      body.mercury.dailyLimit = mercuryDraft.dailyLimit

      const res = await authFetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save')

      const updated = await res.json()
      mutate(updated, false)

      // Clear key inputs and update hasExistingKey
      setOpenaiDraft(prev => prev ? { ...prev, apiKey: '', hasExistingKey: prev.hasExistingKey || !!prev.apiKey } : prev)
      setMercuryDraft(prev => prev ? { ...prev, apiKey: '', hasExistingKey: prev.hasExistingKey || !!prev.apiKey } : prev)

      toast.success('AI settings saved')
    } catch {
      toast.error('Failed to save AI settings')
    } finally {
      setIsSaving(false)
    }
  }, [openaiDraft, mercuryDraft, mutate])

  if (error) {
    return (
      <div className="p-6">
        <AdminErrorState message="Failed to load AI configuration" />
      </div>
    )
  }

  if (isLoading || !openaiDraft || !mercuryDraft) {
    return (
      <div className="p-6">
        <AdminPageHeader title="AI Settings" description="Configure platform AI providers, default models, and daily usage limits" />
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="AI Settings"
        description="Configure platform AI providers, default models, and daily usage limits. Users can override these in their personal settings."
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        }
      />

      <div className="space-y-6 max-w-2xl">
        <ProviderSection
          title="AI for Building & Analysis"
          description="Used for study builders, insights reports, and suggestions (OpenAI-compatible)"
          draft={openaiDraft}
          onDraftChange={(updates) => setOpenaiDraft({ ...openaiDraft, ...updates })}
        />

        <ProviderSection
          title="AI for Writing & Knowledge"
          description="Used for text refinement, knowledge Q&A, and title generation (OpenAI-compatible)"
          draft={mercuryDraft}
          onDraftChange={(updates) => setMercuryDraft({ ...mercuryDraft, ...updates })}
        />
      </div>
    </div>
  )
}
