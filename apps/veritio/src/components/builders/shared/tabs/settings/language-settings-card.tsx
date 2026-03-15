'use client'

import { memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../../types'

export interface LanguageSettingsCardProps {
  language: string
  onLanguageChange: (language: string) => void
  isReadOnly: boolean
}

export const LanguageSettingsCard = memo(function LanguageSettingsCard({
  language,
  onLanguageChange,
  isReadOnly,
}: LanguageSettingsCardProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5" />
          Language Settings
        </CardTitle>
        <CardDescription>Set the language for your study interface</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language">Study Language</Label>
          <p className="text-xs text-muted-foreground">
            The language used for system text and UI elements in your study.
          </p>
          <Select value={language} onValueChange={onLanguageChange} disabled={isReadOnly}>
            <SelectTrigger id="language" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
})
