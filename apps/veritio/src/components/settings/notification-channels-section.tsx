'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, Inbox } from 'lucide-react'
import { getAuthFetchInstance } from '@/lib/swr'
import { toast } from '@/components/ui/sonner'

/**
 * Per-user notification channel preferences.
 *
 * Distinct from the per-study "Study Defaults → Notifications" section, which
 * governs what a study emails its OWNER about (responses, milestones, digest).
 * This governs how YOU are reached, for every category, across the whole app —
 * including things that aren't study-scoped at all, like exports.
 */

type Category = 'mention' | 'study' | 'job' | 'system' | 'billing'

interface ChannelPreference {
  inApp: boolean
  email: boolean
}

type PreferenceMap = Record<Category, ChannelPreference>

const CATEGORIES: Array<{ id: Category; label: string; description: string }> = [
  {
    id: 'mention',
    label: 'Mentions and replies',
    description: 'When someone @mentions you or replies in a thread you are part of',
  },
  {
    id: 'study',
    label: 'Study activity',
    description: 'Responses, analysis, closures and recording retention',
  },
  { id: 'job', label: 'Exports', description: 'When an export or transcript finishes or fails' },
  {
    id: 'system',
    label: 'Workspace',
    description: 'Workspace setup and connected integrations',
  },
  { id: 'billing', label: 'Billing', description: 'Trials, plan changes and payment issues' },
]

export function NotificationChannelsSection() {
  const authFetch = getAuthFetchInstance()
  const [saving, setSaving] = useState<Category | null>(null)

  const { data, error, isLoading, mutate } = useSWR<PreferenceMap>(
    '/api/notification-preferences',
    async (url: string) => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to load preferences')
      return res.json()
    }
  )

  const [prefs, setPrefs] = useState<PreferenceMap | null>(null)
  useEffect(() => {
    if (data) setPrefs(data)
  }, [data])

  const update = useCallback(
    async (category: Category, channel: 'inApp' | 'email', value: boolean) => {
      if (!prefs) return
      const next = { ...prefs, [category]: { ...prefs[category], [channel]: value } }
      setPrefs(next)
      setSaving(category)

      try {
        const res = await authFetch('/api/notification-preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: [{ category, [channel]: value }] }),
        })
        if (!res.ok) throw new Error('Save failed')
        await mutate()
      } catch {
        // Roll back so the switch never shows a state the server rejected.
        setPrefs(prefs)
        toast.error('Could not save that preference')
      } finally {
        setSaving(null)
      }
    },
    [prefs, authFetch, mutate]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          How you are notified
        </CardTitle>
        <CardDescription>
          Choose where each kind of notification reaches you. Turning a category off stops it on
          both channels.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || !prefs ? (
          <p className="py-4 text-sm text-destructive">Couldn&apos;t load your preferences</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span />
              <span>In app</span>
              <span>Email</span>
            </div>

            {CATEGORIES.map((category, index) => (
              <div key={category.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6">
                  <div className="min-w-0">
                    <Label className="text-sm">{category.label}</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
                  </div>

                  <Switch
                    checked={prefs[category.id].inApp}
                    disabled={saving === category.id}
                    onCheckedChange={(v) => void update(category.id, 'inApp', v)}
                    aria-label={`${category.label} in app`}
                  />
                  <Switch
                    checked={prefs[category.id].email}
                    disabled={saving === category.id}
                    onCheckedChange={(v) => void update(category.id, 'email', v)}
                    aria-label={`${category.label} email`}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
