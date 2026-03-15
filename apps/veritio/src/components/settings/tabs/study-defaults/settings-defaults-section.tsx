'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Globe } from 'lucide-react'
import type {
  ResponsePreventionLevel,
  ClosingRuleType,
  StudyDefaultsSettings,
  DeepPartial,
  StudyDefaults,
} from '@/lib/supabase/user-preferences-types'

const RESPONSE_PREVENTION_DESCRIPTIONS: Record<ResponsePreventionLevel, string> = {
  none: 'No duplicate prevention - participants can submit multiple responses',
  relaxed: 'Cookie-based tracking - basic prevention using browser cookies',
  moderate: 'Cookie + IP tracking - moderate prevention combining cookies and IP address',
  strict: 'Browser fingerprinting - advanced prevention using device fingerprinting',
}

interface SettingsDefaultsSectionProps {
  settings: StudyDefaultsSettings
  onUpdate: (updates: DeepPartial<StudyDefaults>) => void
}

export function SettingsDefaultsSection({ settings, onUpdate }: SettingsDefaultsSectionProps) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Default Settings
        </CardTitle>
        <CardDescription>Configuration applied to new studies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language */}
        <div className="space-y-3">
          <Label>Default Language</Label>
          <Select
            value={settings.language || 'en-US'}
            onValueChange={(value) => onUpdate({ settings: { language: value } })}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Response Prevention */}
        <div className="space-y-3">
          <Label>Response Prevention Level</Label>
          <RadioGroup
            value={settings.responsePreventionLevel || 'none'}
            onValueChange={(value: ResponsePreventionLevel) =>
              onUpdate({ settings: { responsePreventionLevel: value } })
            }
            className="space-y-2"
          >
            {(['none', 'relaxed', 'moderate', 'strict'] as const).map((level) => (
              <div key={level} className="flex items-start gap-3">
                <RadioGroupItem value={level} id={`prevention-${level}`} className="mt-1" />
                <div>
                  <Label
                    htmlFor={`prevention-${level}`}
                    className="font-medium capitalize cursor-pointer"
                  >
                    {level}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {RESPONSE_PREVENTION_DESCRIPTIONS[level]}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Closing Rule */}
        <div className="space-y-3">
          <Label>Default Closing Rule</Label>
          <RadioGroup
            value={settings.closingRuleType || 'none'}
            onValueChange={(value: ClosingRuleType) =>
              onUpdate({ settings: { closingRuleType: value } })
            }
            className="space-y-2"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="none" id="closing-none" />
              <Label htmlFor="closing-none" className="cursor-pointer">
                Manually
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="date" id="closing-date" />
              <Label htmlFor="closing-date" className="cursor-pointer">
                Set a date
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="participant_count" id="closing-count" />
              <Label htmlFor="closing-count" className="cursor-pointer">
                Set a participant limit
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="both" id="closing-both" />
              <Label htmlFor="closing-both" className="cursor-pointer">
                Both date and participant limit
              </Label>
            </div>
          </RadioGroup>

          {/* Conditional: Date picker info */}
          {(settings.closingRuleType === 'date' || settings.closingRuleType === 'both') && (
            <div className="pl-6 pt-2">
              <p className="text-xs text-muted-foreground italic">
                The specific close date will be set when creating each study.
              </p>
            </div>
          )}

          {/* Conditional: Participant limit input */}
          {(settings.closingRuleType === 'participant_count' ||
            settings.closingRuleType === 'both') && (
            <div className="space-y-2 pl-6 pt-2">
              <Label htmlFor="default-max-participants">Default Maximum Participants</Label>
              <Input
                id="default-max-participants"
                type="number"
                min={1}
                max={20000}
                value={settings.maxParticipants || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : null
                  onUpdate({ settings: { maxParticipants: value } })
                }}
                placeholder="e.g. 100"
                className="w-full max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Studies will close when this number of responses is reached.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
