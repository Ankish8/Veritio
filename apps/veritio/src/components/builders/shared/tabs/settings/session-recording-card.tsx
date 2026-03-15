'use client'

import { memo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Video, Mic, Monitor, Camera, AlertCircle, Plus, X, RotateCcw, ChevronDown, ChevronRight, Shield, Languages, MessageCircle } from 'lucide-react'
import { DEFAULT_PRIVACY_NOTICE, DEFAULT_THINK_ALOUD, TRANSCRIPTION_LANGUAGES } from '../../types'
import type { RecordingCaptureMode, RecordingScope, SessionRecordingSettings, ThinkAloudSettings } from '../../types'

export interface SessionRecordingCardProps {
  settings: SessionRecordingSettings
  onSettingsChange: (settings: Partial<SessionRecordingSettings>) => void
  isReadOnly: boolean
  /** Study type - recording scope only applies to task-based studies */
  studyType?: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'preference_test'
}

const CAPTURE_MODE_OPTIONS: Array<{
  value: RecordingCaptureMode
  label: string
  icon: React.ReactNode
  description: string
}> = [
  {
    value: 'audio',
    label: 'Audio Only',
    icon: <Mic className="h-4 w-4" />,
    description: 'Record participant think-aloud audio. Works on all devices.',
  },
  {
    value: 'screen_and_audio',
    label: 'Screen + Audio',
    icon: <Monitor className="h-4 w-4" />,
    description: 'Record screen with audio commentary. Desktop only.',
  },
  {
    value: 'video_and_audio',
    label: 'Screen + Audio + Webcam',
    icon: <Camera className="h-4 w-4" />,
    description: 'Record screen, audio, and participant webcam. Desktop only.',
  },
]

const SCOPE_OPTIONS: Array<{
  value: RecordingScope
  label: string
  description: string
}> = [
  {
    value: 'session',
    label: 'Per Session',
    description: 'One continuous recording for the entire study session.',
  },
  {
    value: 'task',
    label: 'Per Task',
    description: 'Separate recording for each task. Easier to analyze individual tasks.',
  },
]

function radioOptionClass(isSelected: boolean, isReadOnly: boolean): string {
  return `flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
  } ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`
}

export const SessionRecordingCard = memo(function SessionRecordingCard({
  settings,
  onSettingsChange,
  isReadOnly,
  studyType,
}: SessionRecordingCardProps) {
  // Only show scope options for task-based study types
  const showScopeOptions = studyType === 'prototype_test' || studyType === 'tree_test' || studyType === 'first_click'

  // Privacy notice state - use defaults if not set
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false)
  const privacyNotice = settings.privacyNotice ?? DEFAULT_PRIVACY_NOTICE

  // Think-aloud prompts state - use defaults if not set
  const [isThinkAloudExpanded, setIsThinkAloudExpanded] = useState(false)
  const thinkAloud = settings.thinkAloud ?? DEFAULT_THINK_ALOUD

  const handleThinkAloudChange = (changes: Partial<ThinkAloudSettings>) => {
    onSettingsChange({ thinkAloud: { ...thinkAloud, ...changes } })
  }

  const handlePrivacyItemChange = (index: number, value: string) => {
    const updated = [...privacyNotice]
    updated[index] = value
    onSettingsChange({ privacyNotice: updated })
  }

  const handleAddPrivacyItem = () => {
    if (privacyNotice.length >= 10) return
    onSettingsChange({ privacyNotice: [...privacyNotice, ''] })
  }

  const handleRemovePrivacyItem = (index: number) => {
    if (privacyNotice.length <= 1) return
    const updated = privacyNotice.filter((_, i) => i !== index)
    onSettingsChange({ privacyNotice: updated })
  }

  const handleResetPrivacyNotice = () => {
    onSettingsChange({ privacyNotice: [...DEFAULT_PRIVACY_NOTICE] })
  }

  const isPrivacyModified = JSON.stringify(privacyNotice) !== JSON.stringify(DEFAULT_PRIVACY_NOTICE)

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-5 w-5" />
              Session Recording
            </CardTitle>
            <CardDescription>
              Record participant sessions for think-aloud analysis and qualitative insights.
            </CardDescription>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => onSettingsChange({ enabled })}
            disabled={isReadOnly}
            aria-label="Enable session recording"
          />
        </div>
      </CardHeader>

      {settings.enabled && (
        <CardContent className="space-y-6">
          {/* Two-column layout for recording options */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Capture Mode */}
            <div className="space-y-3">
              <Label>Capture Mode</Label>
              <RadioGroup
                value={settings.captureMode}
                onValueChange={(value) => onSettingsChange({ captureMode: value as RecordingCaptureMode })}
                disabled={isReadOnly}
                className="space-y-2"
              >
                {CAPTURE_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={radioOptionClass(settings.captureMode === option.value, isReadOnly)}
                  >
                    <RadioGroupItem value={option.value} id={`capture-${option.value}`} className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Right Column - Recording Scope & Privacy Notice */}
            <div className="space-y-6">
              {/* Recording Scope Selection - Only for task-based studies */}
              {showScopeOptions && (
                <div className="space-y-3">
                  <Label>Recording Scope</Label>
                  <RadioGroup
                    value={settings.recordingScope}
                    onValueChange={(value) => onSettingsChange({ recordingScope: value as RecordingScope })}
                    disabled={isReadOnly}
                    className="space-y-2"
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={radioOptionClass(settings.recordingScope === option.value, isReadOnly)}
                      >
                        <RadioGroupItem value={option.value} id={`scope-${option.value}`} className="mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <span className="font-medium text-sm">{option.label}</span>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Transcription Language Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="transcription-language">Transcription Language</Label>
                </div>
                <Select
                  value={settings.transcriptionLanguage || 'auto'}
                  onValueChange={(value) => onSettingsChange({ transcriptionLanguage: value })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="transcription-language" className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSCRIPTION_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Multilingual supports code-switching (e.g., Hindi-English). Select a specific language only if participants will speak exclusively in that language.
                </p>
              </div>

              {/* Privacy Notice Customization */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsPrivacyExpanded(!isPrivacyExpanded)}
                  className="flex items-center gap-2 w-full text-left"
                  disabled={isReadOnly}
                >
                  {isPrivacyExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Privacy Notice</Label>
                  {isPrivacyModified && (
                    <span className="text-xs text-muted-foreground">(customized)</span>
                  )}
                </button>

                {isPrivacyExpanded && (
                  <div className="space-y-3 pl-6">
                    <p className="text-xs text-muted-foreground">
                      Customize the privacy & data usage bullet points shown on the recording consent screen.
                    </p>

                    <div className="space-y-2">
                      {privacyNotice.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">•</span>
                          <Input
                            value={item}
                            onChange={(e) => handlePrivacyItemChange(index, e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Enter privacy notice text..."
                            className="flex-1 text-sm"
                            maxLength={500}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePrivacyItem(index)}
                            disabled={isReadOnly || privacyNotice.length <= 1}
                            className="h-8 w-8 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddPrivacyItem}
                        disabled={isReadOnly || privacyNotice.length >= 10}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </Button>
                      {isPrivacyModified && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetPrivacyNotice}
                          disabled={isReadOnly}
                          className="text-xs text-muted-foreground"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset to Defaults
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Think-Aloud Prompts */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsThinkAloudExpanded(!isThinkAloudExpanded)}
                  className="flex items-center gap-2 w-full text-left"
                  disabled={isReadOnly}
                >
                  {isThinkAloudExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Think-Aloud Prompts</Label>
                  {thinkAloud.enabled && (
                    <span className="text-xs text-primary">(enabled)</span>
                  )}
                </button>

                {isThinkAloudExpanded && (
                  <div className="space-y-4 pl-6">
                    <p className="text-xs text-muted-foreground">
                      Automatically prompt participants to share their thoughts when silence is detected.
                    </p>

                    {/* Enable Think-Aloud Prompts */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="think-aloud-enabled" className="text-sm font-normal">
                          Enable silence detection
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Show gentle reminders when participants are silent
                        </p>
                      </div>
                      <Switch
                        id="think-aloud-enabled"
                        checked={thinkAloud.enabled}
                        onCheckedChange={(enabled) => handleThinkAloudChange({ enabled })}
                        disabled={isReadOnly}
                      />
                    </div>

                    {thinkAloud.enabled && (
                      <>
                        {/* Show Education Screen */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="think-aloud-education" className="text-sm font-normal">
                              Show education screen
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Brief tutorial on how to think aloud effectively
                            </p>
                          </div>
                          <Switch
                            id="think-aloud-education"
                            checked={thinkAloud.showEducation}
                            onCheckedChange={(showEducation) => handleThinkAloudChange({ showEducation })}
                            disabled={isReadOnly}
                          />
                        </div>

                        {/* Silence Threshold Info */}
                        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                          <p>
                            Prompts appear after <strong>{thinkAloud.silenceThresholdSeconds} seconds</strong> of silence
                            and rotate through {DEFAULT_THINK_ALOUD.customPrompts?.length || 4} encouraging messages.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Note - Full width */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Participants will be asked for consent before recording starts. Screen recording requires
              desktop browsers. Mobile users will record audio only.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
})
