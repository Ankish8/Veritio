'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Timer, Hourglass, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { GRADIENT_COLORS } from '@/lib/colors'

// Demo data
const demoData = {
  median: 295000, // 4m 55s
  min: 45000,     // 45s
  max: 720000,    // 12m 0s
  count: 24
}

function formatTime(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
}

function formatTimeDetailed(ms: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return { minutes, seconds }
}

// =============================================================================
// VARIANT 1: Original (Current) - Simple centered display
// =============================================================================
function Variant1() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 1: Original</span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-2">
          <div className="flex items-center justify-center mb-1">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl font-bold text-foreground">{minutes}</span>
            <span className="text-lg text-muted-foreground">m</span>
            <span className="text-3xl font-bold text-foreground ml-1">{seconds}</span>
            <span className="text-lg text-muted-foreground">s</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          It took your participants a median time of {formatTime(demoData.median)} to complete the study. The longest time was {formatTime(demoData.max)} and the shortest was {formatTime(demoData.min)}.
        </p>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 2: Horizontal stats row
// =============================================================================
function Variant2() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 2: Horizontal Stats</span>
      </CardHeader>
      <CardContent>
        {/* Main time display */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold tracking-tight">{minutes}</span>
              <span className="text-xl text-muted-foreground ml-0.5">m</span>
              <span className="text-4xl font-bold tracking-tight ml-1">{seconds}</span>
              <span className="text-xl text-muted-foreground ml-0.5">s</span>
            </div>
            <p className="text-xs text-muted-foreground">median time</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600">
              <TrendingDown className="h-3 w-3" />
              <span className="text-sm font-semibold">{formatTime(demoData.min)}</span>
            </div>
            <p className="text-[12px] text-muted-foreground">Fastest</p>
          </div>
          <div className="text-center border-x">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Minus className="h-3 w-3" />
              <span className="text-sm font-semibold">{demoData.count}</span>
            </div>
            <p className="text-[12px] text-muted-foreground">Responses</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-600">
              <TrendingUp className="h-3 w-3" />
              <span className="text-sm font-semibold">{formatTime(demoData.max)}</span>
            </div>
            <p className="text-[12px] text-muted-foreground">Slowest</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 3: Range bar with gradient
// =============================================================================
function Variant3() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)
  const medianPosition = ((demoData.median - demoData.min) / (demoData.max - demoData.min)) * 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 3: Gradient Range Bar</span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-3">
          {/* Main time display */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold tracking-tight">{minutes}</span>
              <span className="text-lg font-medium text-muted-foreground ml-0.5">m</span>
              <span className="text-4xl font-bold tracking-tight ml-2">{seconds}</span>
              <span className="text-lg font-medium text-muted-foreground ml-0.5">s</span>
            </div>
          </div>

          <span className="text-xs text-muted-foreground mb-4">median completion time</span>

          {/* Range bar */}
          <div className="w-full px-2">
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-primary rounded-full shadow-sm"
                style={{ left: `calc(${medianPosition}% - 6px)` }}
              />
            </div>

            <div className="flex justify-between mt-2">
              <div className="text-center">
                <span className="text-xs font-medium text-emerald-600">{formatTime(demoData.min)}</span>
                <p className="text-[12px] text-muted-foreground">fastest</p>
              </div>
              <div className="text-center">
                <span className="text-xs font-medium text-amber-600">{formatTime(demoData.max)}</span>
                <p className="text-[12px] text-muted-foreground">slowest</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 4: Compact with pill badges
// =============================================================================
function Variant4() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 4: Pill Badges</span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-4">
          {/* Big centered time */}
          <div className="flex items-baseline mb-1">
            <span className="text-5xl font-bold tracking-tighter">{minutes}</span>
            <span className="text-2xl font-medium text-muted-foreground">m</span>
            <span className="text-5xl font-bold tracking-tighter ml-1">{seconds}</span>
            <span className="text-2xl font-medium text-muted-foreground">s</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">median completion</p>

          {/* Pills row */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">
              <Timer className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{formatTime(demoData.min)} fastest</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">
              <Hourglass className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{formatTime(demoData.max)} slowest</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 5: Stacked metrics (Dashboard style)
// =============================================================================
function Variant5() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 5: Stacked Metrics</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary metric */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline">
              <span className="text-4xl font-bold">{minutes}</span>
              <span className="text-xl text-muted-foreground">m </span>
              <span className="text-4xl font-bold">{seconds}</span>
              <span className="text-xl text-muted-foreground">s</span>
            </div>
            <p className="text-sm text-muted-foreground">Median time</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-100">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fastest</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-lg font-semibold">{formatTime(demoData.min)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Slowest</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-lg font-semibold">{formatTime(demoData.max)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 6: Circular progress style
// =============================================================================
function Variant6() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)
  const progress = ((demoData.median - demoData.min) / (demoData.max - demoData.min)) * 100
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 6: Circular Progress</span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-2">
          {/* Circular progress */}
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              {/* Progress arc */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={GRADIENT_COLORS.emerald} />
                  <stop offset="100%" stopColor={GRADIENT_COLORS.amber} />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex items-baseline">
                <span className="text-2xl font-bold">{minutes}</span>
                <span className="text-sm text-muted-foreground">m</span>
                <span className="text-2xl font-bold ml-0.5">{seconds}</span>
                <span className="text-sm text-muted-foreground">s</span>
              </div>
              <span className="text-[12px] text-muted-foreground">median</span>
            </div>
          </div>

          {/* Min/Max labels */}
          <div className="flex justify-between w-full px-4 mt-2">
            <span className="text-xs text-emerald-600 font-medium">{formatTime(demoData.min)}</span>
            <span className="text-xs text-amber-600 font-medium">{formatTime(demoData.max)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 7: Minimal with accent line
// =============================================================================
function Variant7() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-amber-400" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 7: Minimal Accent</span>
      </CardHeader>
      <CardContent>
        <div className="py-4">
          {/* Large time display */}
          <div className="text-center mb-4">
            <span className="text-5xl font-light tracking-tight">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            <p className="text-sm text-muted-foreground mt-1">median completion time</p>
          </div>

          {/* Compact range */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span className="text-muted-foreground">Fast: <span className="font-medium text-foreground">{formatTime(demoData.min)}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-muted-foreground">Slow: <span className="font-medium text-foreground">{formatTime(demoData.max)}</span></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// VARIANT 8: Visual range with markers
// =============================================================================
function Variant8() {
  const { minutes, seconds } = formatTimeDetailed(demoData.median)
  const medianPosition = ((demoData.median - demoData.min) / (demoData.max - demoData.min)) * 100

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Time taken</CardTitle>
        <span className="text-xs text-muted-foreground">Variant 8: Range with Markers</span>
      </CardHeader>
      <CardContent>
        <div className="py-3">
          {/* Time display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold">{minutes}m {seconds}s</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">median of {demoData.count} responses</p>
          </div>

          {/* Range visualization */}
          <div className="relative pt-6 pb-2">
            {/* Track */}
            <div className="h-3 bg-gradient-to-r from-emerald-100 via-blue-100 to-amber-100 rounded-full" />

            {/* Median marker */}
            <div
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${medianPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="text-xs font-medium text-primary mb-1">median</div>
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
              <div className="w-1 h-3 bg-primary -mt-0.5" />
            </div>

            {/* Min marker */}
            <div className="absolute left-0 top-3 w-1 h-6 bg-emerald-500 rounded-full" />

            {/* Max marker */}
            <div className="absolute right-0 top-3 w-1 h-6 bg-amber-500 rounded-full" />
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-1">
            <span className="text-xs font-medium text-emerald-600">{formatTime(demoData.min)}</span>
            <span className="text-xs font-medium text-amber-600">{formatTime(demoData.max)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// DEMO PAGE
// =============================================================================
export default function DemoPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Time Card Variants</h1>
        <p className="text-muted-foreground">
          Compare different design options for the "Time taken" card. Demo data: Median 4m 55s, Fastest 45s, Slowest 12m 0s.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Variant1 />
        <Variant2 />
        <Variant3 />
        <Variant4 />
        <Variant5 />
        <Variant6 />
        <Variant7 />
        <Variant8 />
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h2 className="font-semibold mb-2">Quick Summary:</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><strong>Variant 1:</strong> Original - Simple centered display</li>
          <li><strong>Variant 2:</strong> Horizontal stats row with icon</li>
          <li><strong>Variant 3:</strong> Gradient range bar (currently implemented)</li>
          <li><strong>Variant 4:</strong> Compact with pill badges</li>
          <li><strong>Variant 5:</strong> Stacked metrics (Dashboard style)</li>
          <li><strong>Variant 6:</strong> Circular progress indicator</li>
          <li><strong>Variant 7:</strong> Minimal with accent line</li>
          <li><strong>Variant 8:</strong> Range with triangle markers</li>
        </ul>
      </div>
    </div>
  )
}
