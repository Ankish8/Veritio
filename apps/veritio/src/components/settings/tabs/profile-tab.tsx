'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from '@veritio/auth/client'
import { useUserPreferences } from '@/hooks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, User, Camera } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import type { DisplayNamePreference } from '@/lib/supabase/user-preferences-types'
import {
  uploadUserAvatar,
  deleteUserAvatar,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/supabase/storage'

export function ProfileTab() {
  const { data: session } = useSession()
  const { preferences, updateProfile, isLoading } = useUserPreferences()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  // Local preview URL shown immediately after upload — kept alive until
  // next upload or unmount so Radix hidden-img checker doesn't flash fallback
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null)
  const prevBlobUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) URL.revokeObjectURL(prevBlobUrlRef.current)
    }
  }, [])

  const user = session?.user

  // Use local preview URL if available, otherwise use preferences
  const avatarUrl = localAvatarUrl || preferences?.profile?.avatarUrl || null

  const handleAvatarUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !user?.id) return

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
        toast.error('Please upload an image file (PNG, JPEG, GIF, or WebP)')
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZES.avatar) {
        toast.error('Image must be less than 5MB')
        return
      }

      // Revoke previous blob URL if any (from a prior upload in same session)
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current)
      }

      // Show local preview immediately via object URL
      const previewUrl = URL.createObjectURL(file)
      prevBlobUrlRef.current = previewUrl
      setLocalAvatarUrl(previewUrl)

      setIsUploadingAvatar(true)
      try {
        // Delete old avatar if exists
        const oldAvatarUrl = preferences?.profile?.avatarUrl
        if (oldAvatarUrl) {
          await deleteUserAvatar(oldAvatarUrl).catch(() => {
            // Ignore delete errors - file might not exist
          })
        }

        // Upload new avatar
        const result = await uploadUserAvatar(user.id, file)

        // Update profile with new avatar URL
        await updateProfile({ avatarUrl: result.url })
        // Keep local blob preview alive — avoids Radix hidden-img checker
        // flashing the fallback while the Supabase URL loads.
        // Blob URL is cleaned up on next upload or component unmount.
        toast.success('Avatar updated successfully')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Avatar Upload] Failed:', message, err)
        toast.error(message.length > 100 ? 'Failed to upload avatar' : message)
        // Revert local preview on failure
        setLocalAvatarUrl(null)
        if (prevBlobUrlRef.current) {
          URL.revokeObjectURL(prevBlobUrlRef.current)
          prevBlobUrlRef.current = null
        }
      } finally {
        setIsUploadingAvatar(false)
        // Reset file input so same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [user?.id, preferences?.profile?.avatarUrl, updateProfile]
  )

  const handleDisplayPreferenceChange = useCallback(
    async (value: DisplayNamePreference) => {
      setIsSaving(true)
      try {
        await updateProfile({ displayNamePreference: value })
        toast.success('Display preference updated')
      } catch {
        toast.error('Failed to update display preference')
      } finally {
        setIsSaving(false)
      }
    },
    [updateProfile]
  )

  if (!user) {
    return null
  }

  const initials = getInitials(user.name || user.email)
  const displayPreference = preferences?.profile?.displayNamePreference || 'full_name'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar & Name Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your personal information and how you appear to others
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24" key={avatarUrl || 'no-avatar'}>
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user.name || 'User'} />
                ) : user.image ? (
                  <AvatarImage src={user.image} alt={user.name || 'User'} />
                ) : null}
                <AvatarFallback className="text-xl font-medium bg-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                aria-label="Upload avatar"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title="Change avatar"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium">{user.name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click the camera icon to upload an avatar
              </p>
            </div>
          </div>

          <Separator />

          {/* Name Fields */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={user.name || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Name changes are managed through your authentication provider
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                {user.emailVerified ? (
                  <span className="shrink-0 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    Verified
                  </span>
                ) : (
                  <span className="shrink-0 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Your email cannot be changed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>
            Choose how your name appears across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name format</Label>
            <Select
              value={displayPreference}
              onValueChange={handleDisplayPreferenceChange}
              disabled={isLoading || isSaving}
            >
              <SelectTrigger id="display-name" className="w-full max-w-xs">
                <SelectValue placeholder="Select display format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_name">
                  <div className="flex flex-col">
                    <span>Full name</span>
                    <span className="text-xs text-muted-foreground">
                      {user.name || 'John Doe'}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="first_name">
                  <div className="flex flex-col">
                    <span>First name only</span>
                    <span className="text-xs text-muted-foreground">
                      {user.name?.split(' ')[0] || 'John'}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex flex-col">
                    <span>Email address</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {isSaving && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return 'U'

  if (nameOrEmail.includes('@')) {
    return nameOrEmail[0].toUpperCase()
  }

  const parts = nameOrEmail.trim().split(' ')
  if (parts.length === 1) {
    return parts[0][0].toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
