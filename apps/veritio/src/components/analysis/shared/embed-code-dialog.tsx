'use client'

import { useState, useMemo } from 'react'
import { Copy, Check, Code } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EmbedCodeDialogProps {
  token: string
  children?: React.ReactNode
}

export function EmbedCodeDialog({ token, children }: EmbedCodeDialogProps) {
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('600')
  const [copied, setCopied] = useState(false)

  const embedCode = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.host : 'app.example.com'
    return `<iframe src="https://${host}/results/public/${token}?embed=true" width="${width}" height="${height}" frameborder="0" style="border:1px solid #e5e7eb;border-radius:8px;"></iframe>`
  }, [token, width, height])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = embedCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <Code className="h-3.5 w-3.5 mr-1.5" />
            Embed
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed Results</DialogTitle>
          <DialogDescription>
            Copy this code to embed the results on your website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Dimension Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="embed-width" className="text-sm">
                Width
              </Label>
              <Input
                id="embed-width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="100%"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="embed-height" className="text-sm">
                Height
              </Label>
              <Input
                id="embed-height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="600"
              />
            </div>
          </div>

          {/* Code Preview */}
          <div className="space-y-1.5">
            <Label className="text-sm">Embed Code</Label>
            <div className="relative">
              <pre className="rounded-md border bg-muted/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {embedCode}
              </pre>
            </div>
          </div>

          {/* Copy Button */}
          <Button onClick={handleCopy} className="w-full" variant="outline">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
