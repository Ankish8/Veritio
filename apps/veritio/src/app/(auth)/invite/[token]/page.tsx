'use client'

/**
 * Invitation Acceptance Page
 *
 * Allows users to preview and accept an invitation to join an organization.
 * Shows organization details and role, with options to accept or decline.
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@veritio/auth/client'
import { useAuthFetch } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Users, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { mutate } from 'swr'
import { SWR_KEYS } from '@/lib/swr'

interface InvitationData {
  id: string
  organization_id: string
  invite_type: 'email' | 'link'
  email: string | null
  role: string
  expires_at: string | null
  status: string
  created_at: string
  organization: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
  }
}

const roleDescriptions: Record<string, string> = {
  owner: 'Full control over the organization',
  admin: 'Can manage team members and all projects',
  editor: 'Can edit projects and studies',
  viewer: 'Can view projects and results',
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage(props: PageProps) {
  const { token } = use(props.params)
  const router = useRouter()
  const { data: session, isPending: sessionPending } = useSession()
  const authFetch = useAuthFetch()

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  // Fetch invitation details (public endpoint)
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`)
        if (!response.ok) {
          const data = await response.json()
          if (response.status === 404) {
            setError('This invitation link is invalid or has been revoked.')
          } else if (response.status === 410) {
            setError('This invitation has expired.')
          } else {
            setError(data.error || 'Failed to load invitation')
          }
          return
        }
        const data = await response.json()
        setInvitation(data)
      } catch {
        setError('Failed to load invitation. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!session?.user) {
      // Redirect to sign in, then back to this page
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`)
      return
    }

    setIsAccepting(true)
    try {
      const response = await authFetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invitation')
      }

      setAccepted(true)
      toast.success(`You've joined ${invitation?.organization.name}!`)

      // Invalidate caches so the new org and members show up
      mutate(SWR_KEYS.organizations)
      mutate(SWR_KEYS.organizationMembers(invitation!.organization_id))

      // Redirect to dashboard after a moment
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  // Loading state
  if (isLoading || sessionPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Success state (after accepting)
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome to {invitation?.organization.name}!</CardTitle>
            <CardDescription>
              You've successfully joined as {invitation?.role}. Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main invitation preview
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Organization Avatar */}
          <Avatar className="h-16 w-16 mx-auto mb-4">
            <AvatarImage src={invitation?.organization.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>

          <CardTitle>Join {invitation?.organization.name}</CardTitle>
          <CardDescription>
            You've been invited to join this organization as <strong>{invitation?.role}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Role info */}
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium capitalize">{invitation?.role}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {roleDescriptions[invitation?.role || 'viewer']}
            </p>
          </div>

          {/* Sign in prompt if not authenticated */}
          {!session?.user && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Sign in required
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You'll need to sign in or create an account to accept this invitation.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/">Cancel</Link>
          </Button>
          <Button onClick={handleAccept} disabled={isAccepting} className="flex-1">
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : session?.user ? (
              'Accept Invitation'
            ) : (
              'Sign in to Accept'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
