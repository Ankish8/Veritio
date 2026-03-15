'use client'

/**
 * ShareDialog Component
 *
 * Dialog for creating and managing share links for recordings.
 * Supports password protection and expiration dates.
 */

import { useState, useCallback, useEffect } from 'react'
import { Link2, Copy, Check, Eye, MessageSquare, Lock, Calendar, Trash2, Loader2, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/sonner'

export interface Share {
  id: string
  recording_id: string
  share_code: string
  access_level: 'view' | 'comment'
  password_hash: string | null
  expires_at: string | null
  view_count: number
  created_by: string
  created_at: string
}

interface ShareDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Callback to close dialog */
  onOpenChange: (open: boolean) => void
  /** Recording ID */
  recordingId: string
  /** Existing shares */
  shares: Share[]
  /** Whether shares are loading */
  isLoading: boolean
  /** Callback to create a share */
  onCreate: (data: {
    accessLevel: 'view' | 'comment'
    password?: string
    expiresInDays?: number
  }) => Promise<{ shareCode: string }>
  /** Callback to revoke a share */
  onRevoke: (id: string) => Promise<void>
  /** Optional clip ID for clip-specific sharing */
  clipId?: string
  /** Optional clip title for display context */
  clipTitle?: string
}

export function ShareDialog({
  open,
  onOpenChange,
  recordingId: _recordingId,
  shares,
  isLoading,
  onCreate,
  onRevoke,
  clipId,
  clipTitle,
}: ShareDialogProps) {
  // Determine if this is a clip share
  const isClipShare = !!clipId
  const [isCreating, setIsCreating] = useState(false)
  const [accessLevel, setAccessLevel] = useState<'view' | 'comment'>('comment')
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number>(30)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Success state - shows the created link
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [copiedCreatedUrl, setCopiedCreatedUrl] = useState(false)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset all state when dialog closes
      setCreatedUrl(null)
      setIsCreating(false)
      setCopiedCreatedUrl(false)
    }
  }, [open])

  const handleCreate = useCallback(async () => {
    if (hasPassword && !password.trim()) {
      toast.error('Please enter a password')
      return
    }

    setIsSaving(true)
    try {
      const { shareCode } = await onCreate({
        accessLevel,
        password: hasPassword ? password : undefined,
        expiresInDays,
      })

      // Build the share URL (include clip parameter if sharing a clip)
      const baseShareUrl = `${window.location.origin}/share/recording/${shareCode}`
      const shareUrl = clipId ? `${baseShareUrl}?clip=${clipId}` : baseShareUrl

      // Copy to clipboard and show success state with the URL
      await navigator.clipboard.writeText(shareUrl)
      setCreatedUrl(shareUrl)
      setCopiedCreatedUrl(true)
      setTimeout(() => setCopiedCreatedUrl(false), 2000)

      // Reset creation form (but keep createdUrl visible)
      setIsCreating(false)
      setAccessLevel('comment')
      setHasPassword(false)
      setPassword('')
      setExpiresInDays(30)
    } catch (error) {
      toast.error('Failed to create share link', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [accessLevel, hasPassword, password, expiresInDays, onCreate, clipId])

  // Copy the created URL again
  const handleCopyCreatedUrl = useCallback(async () => {
    if (!createdUrl) return
    await navigator.clipboard.writeText(createdUrl)
    setCopiedCreatedUrl(true)
    setTimeout(() => setCopiedCreatedUrl(false), 2000)
    toast.success('Link copied to clipboard')
  }, [createdUrl])

  // Reset state to create another link
  const handleCreateAnother = useCallback(() => {
    setCreatedUrl(null)
    setIsCreating(true)
  }, [])

  const handleCopyLink = useCallback(async (share: Share) => {
    const baseShareUrl = `${window.location.origin}/share/recording/${share.share_code}`
    const shareUrl = clipId ? `${baseShareUrl}?clip=${clipId}` : baseShareUrl
    await navigator.clipboard.writeText(shareUrl)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Link copied to clipboard')
  }, [clipId])

  const handleConfirmRevoke = useCallback(async () => {
    if (!revokingId) return

    setIsSaving(true)
    try {
      await onRevoke(revokingId)
      setRevokingId(null)
      toast.success('Share link revoked')
    } catch (error) {
      toast.error('Failed to revoke share link', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [revokingId, onRevoke])

  // Filter out revoked shares
  const activeShares = shares.filter(s => !s.expires_at || new Date(s.expires_at) > new Date())

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {isClipShare ? 'Share Clip' : 'Share Recording'}
            </DialogTitle>
            <DialogDescription>
              {isClipShare
                ? `Create shareable link for "${clipTitle || 'this clip'}"`
                : 'Create shareable links to let others view or comment on this recording'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Existing shares - shown first */}
            {activeShares.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Active Links</h4>
                <ScrollArea className="max-h-60">
                  <div className="space-y-2">
                    {activeShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {share.access_level === 'view' ? (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                              {share.access_level === 'view' ? 'View' : 'View & Comment'}
                            </span>
                            {share.password_hash && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{share.view_count} views</span>
                            {share.expires_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires {new Date(share.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyLink(share)}
                            title="Copy link"
                          >
                            {copiedId === share.id ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`/share/recording/${share.share_code}${clipId ? `?clip=${clipId}` : ''}`, '_blank')}
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setRevokingId(share.id)}
                            title="Revoke link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Success state - shows just-created link */}
            {createdUrl && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-medium">Link Created</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={createdUrl}
                    readOnly
                    className="text-sm bg-background"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCreatedUrl}
                    className="flex-shrink-0"
                  >
                    {copiedCreatedUrl ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(createdUrl, '_blank')}
                    className="flex-shrink-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {copiedCreatedUrl ? 'Copied to clipboard!' : 'Share this link with anyone you want to give access.'}
                </p>
              </div>
            )}

            {/* Create form */}
            {isCreating ? (
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium">New Share Link</h4>

                {/* Access level */}
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as 'view' | 'comment')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>View only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="comment">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <span>View &amp; Comment</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiration */}
                <div className="space-y-2">
                  <Label>Expires In</Label>
                  <Select value={String(expiresInDays)} onValueChange={(v) => setExpiresInDays(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Password protection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-toggle" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password Protection
                    </Label>
                    <Switch
                      id="password-toggle"
                      checked={hasPassword}
                      onCheckedChange={setHasPassword}
                    />
                  </div>
                  {hasPassword && (
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Link
                  </Button>
                </div>
              </div>
            ) : !createdUrl && (
              <Button
                variant={activeShares.length > 0 ? 'outline' : 'default'}
                onClick={() => setIsCreating(true)}
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                {activeShares.length > 0 ? 'Create Another Link' : 'Create Share Link'}
              </Button>
            )}

            {/* After creation, show button to create another or close */}
            {createdUrl && !isCreating && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCreateAnother}>
                  Create Another
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <AlertDialog open={!!revokingId} onOpenChange={() => setRevokingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Share Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the share link. Anyone with this link will no longer be able to access the recording.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRevoke} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
