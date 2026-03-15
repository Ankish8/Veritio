'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardTheme } from '@/components/providers/dashboard-theme-provider'
import type { DashboardTheme } from '@/lib/supabase/user-preferences-types'
import { cn } from '@/lib/utils'

const themeOptions: { value: DashboardTheme; label: string; description: string; icon: typeof Sun }[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Classic light appearance',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follows your OS preference',
    icon: Monitor,
  },
]

export function AppearanceTab() {
  const { theme, setTheme } = useDashboardTheme()

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose how the dashboard looks to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors cursor-pointer',
                  theme === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-accent/50'
                )}
              >
                <option.icon className={cn(
                  'h-6 w-6',
                  theme === option.value ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    theme === option.value ? 'text-primary' : 'text-foreground'
                  )}>
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
