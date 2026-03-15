'use client'

import { useState, useCallback, memo, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'
import { cn } from '@/lib/utils'

interface ParticipantLinkCardProps {
  participantUrl?: string
  studyCode: string
  urlSlug: string | null
  onUrlSlugChange: (slug: string | null) => void
  isDraft: boolean
  isReadOnly?: boolean
}

export const ParticipantLinkCard = memo(function ParticipantLinkCard({
  studyCode,
  urlSlug,
  onUrlSlugChange,
  isDraft,
  isReadOnly = false,
}: ParticipantLinkCardProps) {
  const [copied, setCopied] = useState(false)

  // Use local state with blur-sync for better UX
  const {
    value: localUrlSlug,
    setValue: setLocalUrlSlug,
    handleBlur,
  } = useLocalInputSync(urlSlug || '', {
    onSync: (value: string) => onUrlSlugChange(value || null),
  })

  // Compute base URL for preview
  const baseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
  }, [])

  // Validate slug format
  const slugError = useMemo(() => {
    if (!localUrlSlug) return null
    if (localUrlSlug.length < 3) return 'Slug must be at least 3 characters'
    if (!/^[a-z0-9-]+$/.test(localUrlSlug)) return 'Only lowercase letters, numbers, and hyphens allowed'
    if (localUrlSlug.startsWith('-') || localUrlSlug.endsWith('-')) return 'Cannot start or end with a hyphen'
    return null
  }, [localUrlSlug])

  // Compute the actual URL to display and copy (reactive to slug changes)
  const displayUrl = useMemo(() => {
    const slug = localUrlSlug || studyCode
    return `${baseUrl}/s/${slug}`
  }, [localUrlSlug, studyCode, baseUrl])

  const handleCopy = useCallback(async () => {
    if (!displayUrl || isDraft) return

    try {
      await navigator.clipboard.writeText(displayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts - silently ignore
    }
  }, [displayUrl, isDraft])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow lowercase letters, numbers, and hyphens
      setLocalUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    },
    [setLocalUrlSlug]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Participant Link</CardTitle>
        <CardDescription>
          Share this link with participants to collect responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDraft ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Launch your study to get a shareable link.
            </p>
          </div>
        ) : (
          <>
            {/* Main URL Display with Copy Button - reactive to slug changes */}
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 bg-muted rounded-md font-mono text-sm truncate border">
                {displayUrl}
              </div>
              <Button
                variant={copied ? 'default' : 'outline'}
                size="sm"
                onClick={handleCopy}
                disabled={isReadOnly}
                className={cn(
                  'shrink-0 min-w-[100px] transition-all',
                  copied && 'bg-green-600 hover:bg-green-600 text-white'
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            {/* Custom Slug Input - Always Visible */}
            {!isReadOnly && (
              <div className="space-y-3 pt-4 border-t">
                <Label htmlFor="url-slug" className="text-sm font-medium">
                  Custom URL Slug
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
                    {baseUrl}/s/
                  </span>
                  <Input
                    id="url-slug"
                    value={localUrlSlug}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder={studyCode}
                    className={cn(
                      'font-mono text-sm flex-1',
                      slugError && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                </div>

                {/* Validation Error */}
                {slugError && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{slugError}</span>
                  </div>
                )}

                {/* Helper Text / Preview */}
                {!slugError && (
                  <p className="text-xs text-muted-foreground">
                    {localUrlSlug ? (
                      <>Your link will be: <span className="font-mono">{displayUrl}</span></>
                    ) : (
                      <>Leave empty to use default: <span className="font-mono">/s/{studyCode}</span></>
                    )}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
