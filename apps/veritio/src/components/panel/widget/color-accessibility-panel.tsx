import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateContrastRatio, getWCAGLevel } from '@/lib/utils/color-contrast'

interface ColorAccessibilityPanelProps {
  backgroundColor: string
  textColor: string
  buttonColor: string
  buttonTextColor: string
}

function ContrastBadge({ bgColor, textColor }: { bgColor: string; textColor: string }) {
  const ratio = calculateContrastRatio(bgColor, textColor)
  const level = getWCAGLevel(ratio)

  const badgeColor =
    level === 'AAA'
      ? 'bg-green-100 text-green-700 border-green-200'
      : level === 'AA'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-red-100 text-red-700 border-red-200'

  return (
    <div className={cn('px-2 py-1 rounded-md border text-xs font-medium', badgeColor)}>
      {ratio.toFixed(2)}:1 ({level})
    </div>
  )
}

function meetsWCAG_AA(bgColor: string, textColor: string): boolean {
  const ratio = calculateContrastRatio(bgColor, textColor)
  return ratio >= 4.5
}

export function ColorAccessibilityPanel({
  backgroundColor,
  textColor,
  buttonColor,
  buttonTextColor,
}: ColorAccessibilityPanelProps) {
  const bgTextContrast = meetsWCAG_AA(backgroundColor, textColor)
  const buttonContrast = meetsWCAG_AA(buttonColor, buttonTextColor)

  return (
    <>
      {/* Color Contrast Checker */}
      <div className="space-y-3 pt-4 border-t">
        <div className="space-y-0.5">
          <Label>Color Accessibility</Label>
          <p className="text-xs text-muted-foreground">
            Contrast ratios for WCAG 2.1 compliance
          </p>
        </div>

        <div className="space-y-2">
          {/* Background vs Text Color */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Background / Text:</span>
            <ContrastBadge bgColor={backgroundColor} textColor={textColor} />
          </div>

          {/* Button Color vs Button Text */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Button / Button Text:</span>
            <ContrastBadge bgColor={buttonColor} textColor={buttonTextColor} />
          </div>
        </div>
      </div>

      {/* Accessibility Checklist */}
      <div className="space-y-2 pt-4 border-t">
        <Label>Accessibility Features</Label>
        <div className="rounded-md bg-muted/30 p-3 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Keyboard navigation (ESC to close, Tab to navigate)</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Screen reader support with ARIA labels</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Focus trap when widget is open</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            {bgTextContrast && buttonContrast ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <span>
              Color contrast{' '}
              {bgTextContrast && buttonContrast
                ? 'meets WCAG AA standards'
                : 'below WCAG AA minimum (4.5:1)'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
