'use client'

import { useState, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Mail, Copy, Check, Plus } from 'lucide-react'

interface EmailTemplateCardProps {
  studyTitle: string
  participantUrl: string
  isDraft: boolean
  isReadOnly?: boolean
  timeEstimate?: string
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

const PLACEHOLDERS = [
  { token: '{study_name}', label: 'Study Name' },
  { token: '{link}', label: 'Link' },
  { token: '{time_estimate}', label: 'Time' },
] as const

export const EmailTemplateCard = memo(function EmailTemplateCard({
  studyTitle,
  participantUrl,
  isDraft,
  isReadOnly = false,
  timeEstimate = '5-10 minutes',
}: EmailTemplateCardProps) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [copied, setCopied] = useState(false)

  // Replace placeholders with actual values
  const renderTemplate = useCallback(
    (text: string) => {
      return text
        .replace(/{study_name}/g, studyTitle || 'Untitled Study')
        .replace(/{link}/g, participantUrl || '[Link will appear after launch]')
        .replace(/{time_estimate}/g, timeEstimate)
    },
    [studyTitle, participantUrl, timeEstimate]
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
        setBody(newBody)
        // Restore focus and cursor position
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + token.length, start + token.length)
        }, 0)
      } else {
        setBody((prev) => prev + token)
      }
    },
    [body]
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
                onChange={(e) => setBody(e.target.value)}
                disabled={isReadOnly}
                rows={10}
                className="font-mono text-sm"
                placeholder="Enter email body..."
              />
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
