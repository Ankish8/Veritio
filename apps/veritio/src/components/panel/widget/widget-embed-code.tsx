'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code, Copy, Check } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

interface WidgetEmbedCodeProps {
  embedCode: string | null
}

export function WidgetEmbedCode({ embedCode }: WidgetEmbedCodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!embedCode) return

    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      toast.success('Embed code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy code')
    }
  }

  if (!embedCode) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">Loading embed code...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-muted/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Embed Code</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
        </div>
        <CardDescription>Add this code to your website before the closing &lt;/body&gt; tag</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed border border-slate-700 dark:bg-slate-950 dark:border-slate-800">
          <code>{embedCode}</code>
        </pre>
      </CardContent>
    </Card>
  )
}
