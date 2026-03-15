'use client'

import { memo, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'

export interface PasswordProtectionCardProps {
  password: string | null
  onPasswordChange: (password: string | null) => void
  isReadOnly: boolean
}

export const PasswordProtectionCard = memo(function PasswordProtectionCard({
  password,
  onPasswordChange,
  isReadOnly,
}: PasswordProtectionCardProps) {
  const [showPassword, setShowPassword] = useState(false)

  const {
    value: localPassword,
    setValue: setLocalPassword,
    handleBlur,
  } = useLocalInputSync(password || '', {
    onSync: (value: string) => onPasswordChange(value || null),
  })

  const toggleShowPassword = useCallback(() => setShowPassword((prev) => !prev), [])

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-5 w-5" />
          Password Protection
        </CardTitle>
        <CardDescription>Add a password to control who can access your study.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={localPassword}
            onChange={(e) => setLocalPassword(e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g. @c1d3n0m"
            disabled={isReadOnly}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={toggleShowPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})
