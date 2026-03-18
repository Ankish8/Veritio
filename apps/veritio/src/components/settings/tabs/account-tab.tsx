'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut, changePassword, linkSocial, listAccounts } from '@veritio/auth/client'
import { clearAuthToken } from '@veritio/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TypeToDeleteDialog } from '@/components/ui/type-to-delete-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useKeyboardShortcut } from '@veritio/ui'
import { Shield, Key, Link2, LogOut, Trash2, Loader2, AlertTriangle, Eye, EyeOff, Check } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

export function AccountTab() {
  const router = useRouter()
  const { data: session } = useSession()
  const [signingOut, setSigningOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Connected accounts state
  const [accounts, setAccounts] = useState<{ providerId: string; accountId: string }[]>([])
  const [linkingGoogle, setLinkingGoogle] = useState(false)

  useEffect(() => {
    listAccounts().then((res) => {
      if (res.data) {
        setAccounts(res.data.map((a: { providerId: string; id: string }) => ({ providerId: a.providerId, accountId: a.id })))
      }
    }).catch(() => {})
  }, [])

  const googleConnected = accounts.some((a) => a.providerId === 'google')

  const handleLinkGoogle = useCallback(async () => {
    setLinkingGoogle(true)
    try {
      await linkSocial({
        provider: 'google',
        callbackURL: '/settings',
      })
    } catch {
      toast.error('Failed to connect Google account')
      setLinkingGoogle(false)
    }
  }, [])

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const user = session?.user

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await signOut()
      clearAuthToken()
      router.push('/sign-in')
    } catch {
      router.push('/sign-in')
    }
  }, [router])

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true)
    try {
      // TODO: Implement account deletion API
      toast.error('Account deletion is not yet available')
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }, [])

  const resetPasswordForm = useCallback(() => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowCurrentPassword(false)
    setShowNewPassword(false)
  }, [])

  const handlePasswordDialogChange = useCallback((open: boolean) => {
    setPasswordDialogOpen(open)
    if (!open) {
      resetPasswordForm()
    }
  }, [resetPasswordForm])

  // Determine if password form is valid for submission
  const isPasswordFormValid = currentPassword && newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 8

  const handleChangePassword = useCallback(async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })

      if (result.error) {
        // Handle specific error messages from better-auth
        if (result.error.message?.includes('INVALID_PASSWORD') ||
            result.error.message?.includes('incorrect')) {
          toast.error('Current password is incorrect')
        } else if (result.error.message?.includes('CREDENTIAL_ACCOUNT_NOT_FOUND')) {
          toast.error('Password change not available for OAuth accounts')
        } else {
          toast.error(result.error.message || 'Failed to change password')
        }
        return
      }

      toast.success('Password changed successfully')
      handlePasswordDialogChange(false)
    } catch {
      toast.error('Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }, [currentPassword, newPassword, confirmPassword, handlePasswordDialogChange])

  // Keyboard shortcuts: Cmd+Enter to change password (when valid)
  useKeyboardShortcut({
    enabled: passwordDialogOpen && !!isPasswordFormValid && !isChangingPassword,
    onCmdEnter: handleChangePassword,
  })

  if (!user) {
    return null
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Secure your account with a strong password
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
              Change password
            </Button>
          </div>

          {/* Password Change Dialog */}
          <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogChange}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new one
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      disabled={isChangingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      disabled={isChangingPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={isChangingPassword}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handlePasswordDialogChange(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                  <EscapeHint />
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      Change Password
                      <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Connected Accounts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage your connected login methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email/Password */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">@</span>
              </div>
              <div>
                <p className="font-medium text-sm">Email</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Primary</span>
          </div>

          <Separator />

          {/* Google OAuth */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm">Google</p>
                <p className="text-xs text-muted-foreground">
                  {googleConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            {googleConnected ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-green-600" />
                Connected
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
              >
                {linkingGoogle ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sign Out Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Sign Out
          </CardTitle>
          <CardDescription>
            Sign out of your account on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-600">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>

            <TypeToDeleteDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              itemName="DELETE"
              itemType="account"
              title="Delete your account?"
              description={
                <span>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data including projects, studies,
                  and participant responses.
                </span>
              }
              onConfirm={handleDeleteAccount}
              loading={isDeleting}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
