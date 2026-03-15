'use client'

/**
 * Public Share Page
 *
 * Allows external users to view study results via a shareable link.
 * Supports password protection and tracks view analytics.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Lock, Eye, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useValidateShareLink, type ValidateShareLinkResult } from '@/hooks/use-share-links'

// =============================================================================
// LOADING STATE
// =============================================================================

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <div className="h-5 w-40 bg-muted rounded animate-pulse mx-auto" />
              <div className="h-4 w-56 bg-muted rounded animate-pulse mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// PASSWORD FORM
// =============================================================================

interface PasswordFormProps {
  onSubmit: (password: string) => Promise<void>
  isSubmitting: boolean
  error: string | null
  studyTitle?: string
}

function PasswordForm({ onSubmit, isSubmitting, error, studyTitle }: PasswordFormProps) {
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Password Required</CardTitle>
          <CardDescription>
            {studyTitle
              ? `Enter the password to view "${studyTitle}"`
              : 'This shared content is password protected'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || !password}>
              {isSubmitting ? 'Verifying...' : 'View Content'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// EXPIRED LINK
// =============================================================================

function ExpiredLink() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Link Expired</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This share link has expired. Please contact the person who shared
                this with you for a new link.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// INVALID LINK
// =============================================================================

function InvalidLink() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Link Not Found</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This share link doesn&apos;t exist or has been revoked.
                Please check the URL or contact the person who shared this with you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// STUDY VIEWER (Placeholder - will be expanded)
// =============================================================================

interface StudyViewerProps {
  studyId: string
  studyTitle: string
  permissions: {
    allow_download: boolean
    allow_comments: boolean
  }
}

function StudyViewer({ studyId, studyTitle, permissions }: StudyViewerProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{studyTitle}</h1>
              <p className="text-xs text-muted-foreground">Shared Results</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {permissions.allow_download && (
              <Button variant="outline" size="sm">
                Export
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://veritio.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Powered by Veritio
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Content Placeholder */}
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Study Results</CardTitle>
            <CardDescription>
              View the results and insights from this study.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Results Viewer Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                The shared results viewer is being set up. You&apos;ll be able to see
                study responses, analytics, and insights here.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Study ID: {studyId}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function SharePage() {
  const params = useParams()
  const token = params.token as string

  const { validation, isLoading, error, validate } = useValidateShareLink(token)

  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockedData, setUnlockedData] = useState<ValidateShareLinkResult | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check for password in URL (for shared links with embedded password)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const urlPassword = urlParams.get('p')

    if (urlPassword && validation?.requires_password && !isUnlocked) {
      handlePasswordSubmit(urlPassword)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on validation change, not on handlePasswordSubmit/isUnlocked changes
  }, [validation])

  const handlePasswordSubmit = useCallback(
    async (password: string) => {
      setIsSubmitting(true)
      setPasswordError(null)

      try {
        const result = await validate(password)
        if (result.valid) {
          setIsUnlocked(true)
          setUnlockedData(result)
        } else {
          setPasswordError('Incorrect password')
        }
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : 'Failed to verify password')
      } finally {
        setIsSubmitting(false)
      }
    },
    [validate]
  )

  // Loading state
  if (isLoading) {
    return <LoadingState />
  }

  // Error or invalid link
  if (error || !validation) {
    return <InvalidLink />
  }

  // Expired link
  if (validation.expired) {
    return <ExpiredLink />
  }

  // Password required and not yet unlocked
  if (validation.requires_password && !isUnlocked) {
    return (
      <PasswordForm
        onSubmit={handlePasswordSubmit}
        isSubmitting={isSubmitting}
        error={passwordError}
        studyTitle={validation.study_title}
      />
    )
  }

  // Valid and accessible - show study viewer
  const data = isUnlocked ? unlockedData : validation

  if (data?.valid && data.study_id && data.permissions) {
    return (
      <StudyViewer
        studyId={data.study_id}
        studyTitle={data.study_title || 'Shared Study'}
        permissions={data.permissions}
      />
    )
  }

  // Fallback for invalid state
  return <InvalidLink />
}
