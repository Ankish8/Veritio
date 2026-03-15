'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MessageEditorProps {
  welcomeMessage: string
  thankYouMessage: string
  onWelcomeChange: (message: string) => void
  onThankYouChange: (message: string) => void
}

export function MessageEditor({
  welcomeMessage,
  thankYouMessage,
  onWelcomeChange,
  onThankYouChange,
}: MessageEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Messages</CardTitle>
        <CardDescription>
          Customize the messages participants see at the start and end of the study.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="welcome">Welcome Message</Label>
          <Textarea
            id="welcome"
            placeholder="Enter a welcome message for participants..."
            value={welcomeMessage}
            onChange={(e) => onWelcomeChange(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Shown when participants first open your study.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thankyou">Thank You Message</Label>
          <Textarea
            id="thankyou"
            placeholder="Enter a thank you message..."
            value={thankYouMessage}
            onChange={(e) => onThankYouChange(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Shown after participants complete the study.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
