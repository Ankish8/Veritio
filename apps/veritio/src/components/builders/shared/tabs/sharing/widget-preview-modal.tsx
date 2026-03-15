'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Monitor, Tablet, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InterceptWidgetSettings } from '../../types'

interface WidgetPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: InterceptWidgetSettings
  participantUrl: string
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'

const DEVICES = [
  { value: 'desktop' as const, label: 'Desktop', icon: Monitor },
  { value: 'tablet' as const, label: 'Tablet', icon: Tablet },
  { value: 'mobile' as const, label: 'Mobile', icon: Smartphone },
]

export function WidgetPreviewModal({
  open,
  onOpenChange,
  settings,
  participantUrl,
}: WidgetPreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>('desktop')

  // Generate preview URL
  const getPreviewUrl = () => {
    const params = new URLSearchParams({
      'study-url': participantUrl,
      'api-base': typeof window !== 'undefined' ? window.location.origin : '',
      'position': settings.position,
      'bg-color': settings.backgroundColor,
      'text-color': settings.textColor,
      'button-color': settings.buttonColor,
      'title': settings.title,
      'description': settings.description,
      'button-text': settings.buttonText,
      'trigger': settings.triggerType,
      'trigger-value': String(settings.triggerValue || 5),
      // eslint-disable-next-line react-hooks/purity
      '_t': String(Date.now()),
    })
    return `/widget-preview?${params.toString()}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Widget Preview</DialogTitle>
          <DialogDescription>
            Test your widget in a realistic environment. The widget will appear after the configured
            trigger delay.
          </DialogDescription>
        </DialogHeader>

        {/* Device Switcher */}
        <div className="flex gap-2">
          {DEVICES.map((dev) => {
            const Icon = dev.icon
            return (
              <Button
                key={dev.value}
                type="button"
                variant={device === dev.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDevice(dev.value)}
                className="flex-1"
              >
                <Icon className="h-4 w-4 mr-2" />
                {dev.label}
              </Button>
            )
          })}
        </div>

        {/* Preview Frame */}
        <div className="flex-1 min-h-0">
          <div
            className={cn(
              'h-full mx-auto border rounded-lg overflow-hidden bg-muted/50',
              device === 'desktop' && 'w-full',
              device === 'tablet' && 'w-[768px]',
              device === 'mobile' && 'w-[375px]'
            )}
          >
            <iframe
              src={getPreviewUrl()}
              className="w-full h-full"
              title="Widget Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
