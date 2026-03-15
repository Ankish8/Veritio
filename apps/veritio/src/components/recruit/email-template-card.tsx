'use client'

import { useState, useCallback, memo, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mail, Copy, Check, Plus, Gift } from 'lucide-react'
import { formatIncentiveDisplay, shouldShowIncentive, type IncentiveDisplayConfig } from '@/lib/utils/format-incentive'

interface EmailTemplateCardProps {
  studyTitle: string
  participantUrl: string
  isDraft: boolean
  isReadOnly?: boolean
  timeEstimate?: string
  incentiveConfig?: IncentiveDisplayConfig | null
  /** Controlled subject — if provided, component uses this instead of local state */
  subject?: string
  onSubjectChange?: (subject: string) => void
  /** Controlled body — if provided, component uses this instead of local state */
  body?: string
  onBodyChange?: (body: string) => void
}

const DEFAULT_SUBJECT = 'Help us improve - Take a quick survey'
const DEFAULT_BODY = `Hi there,

We're conducting research to improve our product and would love your feedback.

Study: {study_name}
Estimated time: {time_estimate}

Click here to participate:
{link}

Your input is valuable and will help us make better decisions.

Thank you!`

const DEFAULT_BODY_WITH_INCENTIVE = `Hi there,

We're conducting research to improve our product and would love your feedback.

Study: {study_name}
Estimated time: {time_estimate}
Reward: {incentive}

Click here to participate:
{link}

Your input is valuable and will help us make better decisions.

Thank you!`

const PLACEHOLDERS = [
  { token: '{study_name}', label: 'Study Name' },
  { token: '{link}', label: 'Link' },
  { token: '{time_estimate}', label: 'Time' },
  { token: '{incentive}', label: 'Incentive' },
] as const

export const EmailTemplateCard = memo(function EmailTemplateCard({
  studyTitle,
  participantUrl,
  isDraft,
  isReadOnly = false,
  timeEstimate = '5-10 minutes',
  incentiveConfig,
  subject: controlledSubject,
  onSubjectChange,
  body: controlledBody,
  onBodyChange,
}: EmailTemplateCardProps) {
  const hasIncentive = shouldShowIncentive(incentiveConfig)
  // Also check if incentive is just enabled (even without amount configured)
  const isIncentiveEnabled = incentiveConfig?.enabled ?? false

  // Track previous incentive state for change detection
  const prevIsEnabledRef = useRef(isIncentiveEnabled)

  // Support controlled or uncontrolled mode
  const [localSubject, setLocalSubject] = useState(DEFAULT_SUBJECT)
  const [localBody, setLocalBody] = useState(() =>
    isIncentiveEnabled ? DEFAULT_BODY_WITH_INCENTIVE : DEFAULT_BODY
  )
  const [copied, setCopied] = useState(false)

  const subject = controlledSubject ?? localSubject
  const setSubject = onSubjectChange ?? setLocalSubject
  const body = controlledBody ?? localBody
  const setBodyValue = onBodyChange ?? setLocalBody

  // Auto-sync template when incentive enabled state changes
  useEffect(() => {
    const wasEnabled = prevIsEnabledRef.current
    const isEnabled = isIncentiveEnabled

    // Only trigger on actual change
    if (wasEnabled !== isEnabled) {
      prevIsEnabledRef.current = isEnabled

      if (isEnabled) {
        // Incentive was just enabled - add reward line if not present
        if (!body.includes('{incentive}') && !body.includes('Reward:')) {
          const timeEstimateLine = 'Estimated time: {time_estimate}'
          if (body.includes(timeEstimateLine)) {
            setBodyValue(body.replace(  
              timeEstimateLine,
              `${timeEstimateLine}\nReward: {incentive}`
            ))
          } else {
            setBodyValue(DEFAULT_BODY_WITH_INCENTIVE)  
          }
        }
      } else {
        // Incentive was just disabled - remove reward line
        setBodyValue(body  
          .replace(/\nReward: \{incentive\}/g, '')
          .replace(/Reward: \{incentive\}\n/g, '')
          .replace(/Reward: \{incentive\}/g, '')
        )
      }
    }
  }, [isIncentiveEnabled, body, setBodyValue])

  // Track user edits (for hint display purposes)
  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBodyValue(e.target.value)
  }, [setBodyValue])

  // Check if incentive placeholder is missing when incentive is configured
  const showIncentiveHint = hasIncentive && !body.includes('{incentive}')

  // Replace placeholders with actual values
  const renderTemplate = useCallback(
    (text: string) => {
      const incentiveText = formatIncentiveDisplay(incentiveConfig) || '[No incentive configured]'
      return text
        .replace(/{study_name}/g, studyTitle || 'Untitled Study')
        .replace(/{link}/g, participantUrl || '[Link will appear after launch]')
        .replace(/{time_estimate}/g, timeEstimate)
        .replace(/{incentive}/g, incentiveText)
    },
    [studyTitle, participantUrl, timeEstimate, incentiveConfig]
  )

  const handleCopy = useCallback(async () => {
    const renderedSubject = renderTemplate(subject)
    const renderedBody = renderTemplate(body)
    const fullEmail = `Subject: ${renderedSubject}\n\n${renderedBody}`

    try {
      await navigator.clipboard.writeText(fullEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [subject, body, renderTemplate])

  const insertPlaceholder = useCallback(
    (token: string) => {
      // Insert at cursor position in body textarea
      const textarea = document.getElementById('email-body') as HTMLTextAreaElement
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newBody = body.substring(0, start) + token + body.substring(end)
        setBodyValue(newBody)
        // Restore focus and cursor position
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + token.length, start + token.length)
        }, 0)
      } else {
        setBodyValue(body + token)
      }
    },
    [body, setBodyValue]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Email Template</CardTitle>
        </div>
        <CardDescription>
          Customize an email invitation to send to participants.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDraft ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Launch your study to use the email template.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject Line</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isReadOnly}
                placeholder="Enter email subject..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">Email Body</Label>
                <div className="flex items-center gap-1">
                  {PLACEHOLDERS.map((p) => (
                    <Button
                      key={p.token}
                      variant="ghost"
                      size="sm"
                      onClick={() => insertPlaceholder(p.token)}
                      disabled={isReadOnly}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                id="email-body"
                value={body}
                onChange={handleBodyChange}
                disabled={isReadOnly}
                rows={10}
                className="font-mono text-sm"
                placeholder="Enter email body..."
              />
              {showIncentiveHint && (
                <div className="flex items-start gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
                  <Gift className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-green-800">
                    <p className="font-medium">Incentive configured!</p>
                    <p className="text-green-700">
                      Add <code className="bg-green-100 px-1 rounded">{'{incentive}'}</code> to your template to show participants they&apos;ll receive{' '}
                      <strong>{formatIncentiveDisplay(incentiveConfig)}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={isReadOnly}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Email Template
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Placeholders will be replaced with actual values when copied.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
})
