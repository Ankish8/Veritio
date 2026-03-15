import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Layout, Info, MessageSquare, AlignJustify, Square, ArrowRight, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  WidgetStyle,
  BannerPosition,
  SlideDirection,
  BadgePosition,
  WidgetAnimation,
} from '../types'

interface WidgetTemplateSelectorProps {
  widgetStyle?: WidgetStyle
  bannerPosition?: BannerPosition
  slideDirection?: SlideDirection
  badgePosition?: BadgePosition
  animation?: WidgetAnimation
  onChange: (updates: {
    widgetStyle?: WidgetStyle
    bannerPosition?: BannerPosition
    slideDirection?: SlideDirection
    badgePosition?: BadgePosition
    animation?: WidgetAnimation
  }) => void
  isReadOnly?: boolean
}

const TEMPLATES = [
  {
    value: 'popup' as const,
    label: 'Popup',
    description: 'Corner card (default)',
    Icon: MessageSquare,
  },
  {
    value: 'banner' as const,
    label: 'Banner',
    description: 'Full-width top/bottom bar',
    Icon: AlignJustify,
  },
  {
    value: 'modal' as const,
    label: 'Modal',
    description: 'Center overlay',
    Icon: Square,
  },
  {
    value: 'drawer' as const,
    label: 'Drawer',
    description: 'Full-height side panel',
    Icon: ArrowRight,
  },
  {
    value: 'badge' as const,
    label: 'Badge',
    description: 'Persistent tab on edge',
    Icon: Tag,
  },
]

const ANIMATIONS = [
  { value: 'fade' as const, label: 'Fade' },
  { value: 'slide' as const, label: 'Slide' },
  { value: 'zoom' as const, label: 'Zoom' },
  { value: 'bounce' as const, label: 'Bounce' },
]

export function WidgetTemplateSelector({
  widgetStyle = 'popup',
  bannerPosition = 'bottom',
  slideDirection = 'right',
  badgePosition = 'right',
  animation = 'fade',
  onChange,
  isReadOnly = false,
}: WidgetTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Layout className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium">Widget Template</h4>
          <p className="text-xs text-muted-foreground">
            Choose visual style and animation
          </p>
        </div>
      </div>

      {/* Template List - Compact vertical layout */}
      <div className="space-y-2">
        {TEMPLATES.map((template) => {
          const Icon = template.Icon
          return (
            <button
              key={template.value}
              type="button"
              onClick={() => onChange({ widgetStyle: template.value })}
              disabled={isReadOnly}
              className={cn(
                'w-full p-3 rounded-md border transition-all text-left',
                'hover:border-primary/50 hover:bg-muted/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-3',
                widgetStyle === template.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded flex-shrink-0',
                widgetStyle === template.value ? 'bg-primary/10' : 'bg-muted'
              )}>
                <Icon className={cn(
                  'h-4 w-4',
                  widgetStyle === template.value ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{template.label}</p>
                <p className="text-xs text-muted-foreground truncate">{template.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Template-Specific Options */}
      {widgetStyle === 'banner' && (
        <div className="space-y-2">
          <Label htmlFor="banner-position">Banner Position</Label>
          <Select
            value={bannerPosition}
            onValueChange={(value) =>
              onChange({ bannerPosition: value as BannerPosition })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger id="banner-position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top of Page</SelectItem>
              <SelectItem value="bottom">Bottom of Page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {widgetStyle === 'drawer' && (
        <div className="space-y-2">
          <Label htmlFor="slide-direction">Drawer Direction</Label>
          <Select
            value={slideDirection}
            onValueChange={(value) =>
              onChange({ slideDirection: value as SlideDirection })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger id="slide-direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">From Left</SelectItem>
              <SelectItem value="right">From Right</SelectItem>
              <SelectItem value="top">From Top</SelectItem>
              <SelectItem value="bottom">From Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {widgetStyle === 'badge' && (
        <div className="space-y-2">
          <Label htmlFor="badge-position">Badge Position</Label>
          <Select
            value={badgePosition}
            onValueChange={(value) =>
              onChange({ badgePosition: value as BadgePosition })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger id="badge-position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left Edge</SelectItem>
              <SelectItem value="right">Right Edge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Animation */}
      <div className="space-y-2">
        <Label htmlFor="animation">Animation</Label>
        <Select
          value={animation}
          onValueChange={(value) =>
            onChange({ animation: value as WidgetAnimation })
          }
          disabled={isReadOnly}
        >
          <SelectTrigger id="animation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATIONS.map((anim) => (
              <SelectItem key={anim.value} value={anim.value}>
                {anim.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info Note */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          Different templates work better for different use cases. Popup is least intrusive, Banner
          has highest visibility, Modal is most attention-grabbing.
        </p>
      </div>
    </div>
  )
}
