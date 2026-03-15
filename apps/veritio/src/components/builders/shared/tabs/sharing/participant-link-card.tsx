'use client'

import { useState, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'

interface ParticipantLinkCardProps {
  participantUrl: string
  studyCode: string
  urlSlug: string | null
  onUrlSlugChange: (slug: string | null) => void
  isDraft: boolean
  isReadOnly?: boolean
}

export const ParticipantLinkCard = memo(function ParticipantLinkCard({
  participantUrl,
  studyCode,
  urlSlug,
  onUrlSlugChange,
  isDraft,
  isReadOnly = false,
}: ParticipantLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Use local state with blur-sync for better UX
  const {
    value: localUrlSlug,
    setValue: setLocalUrlSlug,
    handleBlur,
  } = useLocalInputSync(urlSlug || '', {
    onSync: (value: string) => onUrlSlugChange(value || null),
  })

  const handleCopy = useCallback(async () => {
    if (!participantUrl || isDraft) return

    try {
      await navigator.clipboard.writeText(participantUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts - silently ignore
    }
  }, [participantUrl, isDraft])

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
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                {participantUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={isReadOnly}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Using: <code className="bg-muted px-1 rounded">{studyCode}</code>
              </span>
              {!isReadOnly && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors"
                >
                  <Settings className="h-3 w-3" />
                  Customize URL
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>

            {/* Expandable URL customization section */}
            {isExpanded && !isReadOnly && (
              <div className="pt-4 mt-4 border-t space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="url-slug" className="text-sm font-medium">
                    Custom URL Slug
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Create a memorable, easy-to-share link for your study.
                  </p>
                  <Input
                    id="url-slug"
                    value={localUrlSlug}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder={`e.g., ${studyCode}`}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens are allowed.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
