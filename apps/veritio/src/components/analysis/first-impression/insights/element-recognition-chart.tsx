'use client'

/**
 * Element Recognition Chart
 *
 * Horizontal bar chart showing which UI elements
 * participants noticed and mentioned in their responses.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Eye,
  Palette,
  MousePointerClick,
  Type,
  Image,
  Menu,
  CreditCard,
  FormInput,
} from 'lucide-react'
import type { ElementRecognitionResult } from '@/lib/algorithms/element-recognition'

interface ElementRecognitionChartProps {
  results: ElementRecognitionResult[]
  totalResponses: number
}

export function ElementRecognitionChart({
  results,
  totalResponses,
}: ElementRecognitionChartProps) {
  // Get icon for element
  const getElementIcon = (elementId: string) => {
    switch (elementId) {
      case 'logo':
        return <Eye className="h-4 w-4" />
      case 'headline':
        return <Type className="h-4 w-4" />
      case 'cta':
        return <MousePointerClick className="h-4 w-4" />
      case 'navigation':
        return <Menu className="h-4 w-4" />
      case 'image':
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image className="h-4 w-4" />
      case 'color':
        return <Palette className="h-4 w-4" />
      case 'form':
        return <FormInput className="h-4 w-4" />
      case 'pricing':
        return <CreditCard className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'branding':
        return 'bg-purple-500'
      case 'navigation':
        return 'bg-blue-500'
      case 'content':
        return 'bg-green-500'
      case 'action':
        return 'bg-orange-500'
      case 'visual':
        return 'bg-pink-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Filter to elements with at least 1 mention
  const mentionedElements = results.filter(r => r.mentionCount > 0)

  // Get max percentage for relative bar sizing
  const maxPercentage = Math.max(...results.map(r => r.percentage), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Element Recognition</CardTitle>
        <CardDescription>
          What participants noticed and remembered
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mentionedElements.length > 0 ? (
          <div className="space-y-3">
            {results.slice(0, 8).map((result) => (
              <TooltipProvider key={result.element.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-help">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground">
                            {getElementIcon(result.element.id)}
                          </div>
                          <span className="font-medium">{result.element.name}</span>
                          <Badge
                            variant="outline"
                            className="text-[12px] px-1.5 py-0"
                          >
                            {result.element.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {result.mentionCount}
                          </span>
                          <span className="font-medium w-12 text-right">
                            {result.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getCategoryColor(result.element.category)}`}
                          style={{
                            width: `${(result.percentage / maxPercentage) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">
                      {result.mentionCount} of {totalResponses} responses mentioned {result.element.name.toLowerCase()}
                    </p>
                    {result.sampleResponses.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">
                          Sample responses:
                        </p>
                        <ul className="text-xs space-y-1">
                          {result.sampleResponses.map((sample, idx) => (
                            <li key={idx} className="italic truncate">
                              &ldquo;{sample.slice(0, 50)}...&rdquo;
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No element mentions detected</p>
            <p className="text-xs">
              This analysis requires text responses from participants
            </p>
          </div>
        )}

        {/* Category Legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <CategoryLegend color="bg-purple-500" label="Branding" />
          <CategoryLegend color="bg-blue-500" label="Navigation" />
          <CategoryLegend color="bg-green-500" label="Content" />
          <CategoryLegend color="bg-orange-500" label="Action" />
          <CategoryLegend color="bg-pink-500" label="Visual" />
        </div>
      </CardContent>
    </Card>
  )
}

function CategoryLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
