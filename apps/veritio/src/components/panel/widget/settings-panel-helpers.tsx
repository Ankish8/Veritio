'use client'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

import type { Demographics, WidgetTargetingSettings, WidgetSchedulingSettings, WidgetPrivacySettings } from '@/lib/supabase/panel-types'

export const DEMOGRAPHIC_FIELDS: { key: keyof Demographics; label: string }[] = [
  { key: 'country', label: 'Country' },
  { key: 'age_range', label: 'Age Range' },
  { key: 'gender', label: 'Gender' },
  { key: 'industry', label: 'Industry' },
  { key: 'job_role', label: 'Job Role' },
  { key: 'company_size', label: 'Company Size' },
  { key: 'language', label: 'Language' },
]

export const DAYS_OF_WEEK = [
  { value: 0, label: 'S' },
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
]


export const DEFAULT_TARGETING: WidgetTargetingSettings = {
  newVisitors: false,
  returningVisitors: false,
  excludeParticipants: true,
}

export const DEFAULT_SCHEDULING: WidgetSchedulingSettings = {
  enabled: false,
  businessHoursOnly: false,
  businessHours: { start: '09:00', end: '17:00' },
  daysOfWeek: [] as number[],
  dateRange: { start: undefined, end: undefined },
  timezone: 'user',
}

export const DEFAULT_PRIVACY: WidgetPrivacySettings = {
  respectDoNotTrack: false,
  showPrivacyLink: false,
  privacyLinkUrl: '',
  privacyLinkText: 'Privacy Policy',
  cookieConsent: { enabled: false, framework: 'onetrust' },
}

export function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 hover:bg-muted/50 rounded-md px-2 transition-colors">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 pb-2 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  )
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: React.ReactNode
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function CheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="text-sm cursor-pointer">
        {label}
      </Label>
    </div>
  )
}

export function Divider() {
  return <div className="border-t my-4" />
}
