'use client'

import { memo } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Mail,
  CheckCircle2,
  Copy,
  Globe,
  MousePointer,
  FileText,
  User2,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'

import type { PanelParticipantWithDetails } from '@/lib/supabase/panel-types'

interface ParticipantProfileTabProps {
  participant: PanelParticipantWithDetails
  onEditDemographics?: () => void
  onEditTags?: () => void
}

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  widget: { label: 'Widget Capture', icon: <MousePointer className="h-3.5 w-3.5" /> },
  import: { label: 'CSV Import', icon: <FileText className="h-3.5 w-3.5" /> },
  manual: { label: 'Manual Entry', icon: <User2 className="h-3.5 w-3.5" /> },
  link: { label: 'Trackable Link', icon: <ExternalLink className="h-3.5 w-3.5" /> },
  email: { label: 'Email Campaign', icon: <Mail className="h-3.5 w-3.5" /> },
  study_completion: { label: 'Study Completion', icon: <Globe className="h-3.5 w-3.5" /> },
}

interface BrowserData {
  browser?: string
  operatingSystem?: string
  deviceType?: string
  language?: string
  timeZone?: string
  screenResolution?: string
  geoLocation?: {
    country?: string | null
    region?: string | null
    city?: string | null
  }
}

export const ParticipantProfileTab = memo(function ParticipantProfileTab({
  participant,
  onEditDemographics,
  onEditTags,
}: ParticipantProfileTabProps) {
  const demographics = participant.demographics || {}
  const customAttributes = participant.custom_attributes || {}
  const hasDemographics = Object.values(demographics).some(Boolean)
  const hasCustomAttributes = Object.keys(customAttributes).length > 0
  const sourceConfig = SOURCE_CONFIG[participant.source] || { label: participant.source, icon: <Globe className="h-3.5 w-3.5" /> }

  const sourceDetails = participant.source_details as Record<string, unknown> | null
  const browserData = sourceDetails?.browser_data as BrowserData | undefined
  const hasBrowserData = browserData && (browserData.browser || browserData.deviceType || browserData.operatingSystem)

  const copyEmail = () => {
    navigator.clipboard.writeText(participant.email)
    toast.success('Email copied to clipboard')
  }

  return (
    <div className="space-y-8">
      <ProfileSection title="Contact Information">
        <ProfileRow label="Email">
          <div className="flex items-center gap-2 group">
            <span>{participant.email}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={copyEmail}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </ProfileRow>
        <ProfileRow label="Joined">
          {format(new Date(participant.created_at), 'MMM d, yyyy')}
        </ProfileRow>
        <ProfileRow label="Source">
          <div className="flex items-center gap-1.5">
            {sourceConfig.icon}
            <span>{sourceConfig.label}</span>
          </div>
        </ProfileRow>
        <ProfileRow label="Consent">
          {participant.consent_given_at ? (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Consented on {format(new Date(participant.consent_given_at), 'MMM d, yyyy')}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Not recorded</span>
          )}
        </ProfileRow>
        {participant.last_contacted_at && (
          <ProfileRow label="Last Contacted">
            {format(new Date(participant.last_contacted_at), 'MMM d, yyyy')}
          </ProfileRow>
        )}
      </ProfileSection>

      <ProfileSection
        title="Tags"
        action={onEditTags && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEditTags}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      >
        <ProfileRow label="Tags">
          {participant.tags && participant.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {participant.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  className="px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    border: `1px solid ${tag.color}30`,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">No tags assigned</span>
          )}
        </ProfileRow>
      </ProfileSection>

      <ProfileSection
        title="Demographics"
        action={onEditDemographics && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEditDemographics}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      >
        {hasDemographics ? (
          <>
            {demographics.country && <ProfileRow label="Country">{demographics.country}</ProfileRow>}
            {demographics.age_range && <ProfileRow label="Age Range">{demographics.age_range}</ProfileRow>}
            {demographics.gender && <ProfileRow label="Gender">{formatGender(demographics.gender)}</ProfileRow>}
            {demographics.language && <ProfileRow label="Language">{demographics.language}</ProfileRow>}
            {demographics.industry && <ProfileRow label="Industry">{demographics.industry}</ProfileRow>}
            {demographics.job_role && <ProfileRow label="Job Role">{demographics.job_role}</ProfileRow>}
            {demographics.company_size && <ProfileRow label="Company Size">{demographics.company_size}</ProfileRow>}
          </>
        ) : (
          <ProfileRow label="Demographics">
            <span className="text-muted-foreground">No demographics recorded</span>
          </ProfileRow>
        )}
      </ProfileSection>

      {hasBrowserData && (
        <ProfileSection title="Device Info" badge="Auto-detected">
          {browserData?.deviceType && <ProfileRow label="Device">{browserData.deviceType}</ProfileRow>}
          {browserData?.browser && <ProfileRow label="Browser">{browserData.browser}</ProfileRow>}
          {browserData?.operatingSystem && <ProfileRow label="OS">{browserData.operatingSystem}</ProfileRow>}
          {browserData?.screenResolution && <ProfileRow label="Screen">{browserData.screenResolution}</ProfileRow>}
          {browserData?.language && <ProfileRow label="Language">{browserData.language}</ProfileRow>}
          {browserData?.timeZone && <ProfileRow label="Timezone">{browserData.timeZone}</ProfileRow>}
          {browserData?.geoLocation?.country && (
            <ProfileRow label="Location">
              {[browserData.geoLocation.city, browserData.geoLocation.region, browserData.geoLocation.country]
                .filter(Boolean)
                .join(', ')}
            </ProfileRow>
          )}
        </ProfileSection>
      )}

      {sourceDetails && Object.keys(sourceDetails).length > 0 && (
        <ProfileSection title="Source Details">
          {Object.entries(sourceDetails)
            .filter(([key, value]) => value !== null && typeof value !== 'object' && key !== 'browser_data')
            .map(([key, value]) => (
              <ProfileRow key={key} label={formatAttributeKey(key)}>
                <span className="font-mono text-xs">{String(value)}</span>
              </ProfileRow>
            ))}
        </ProfileSection>
      )}

      {hasCustomAttributes && (
        <ProfileSection title="Custom Attributes">
          {Object.entries(customAttributes).map(([key, value]) => (
            <ProfileRow key={key} label={formatAttributeKey(key)}>
              {String(value)}
            </ProfileRow>
          ))}
        </ProfileSection>
      )}
    </div>
  )
})

interface ProfileSectionProps {
  title: string
  badge?: string
  action?: React.ReactNode
  children: React.ReactNode
}

function ProfileSection({ title, badge, action, children }: ProfileSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
          {badge && (
            <Badge variant="secondary" className="text-[12px] px-1.5 py-0">{badge}</Badge>
          )}
        </div>
        {action}
      </div>
      <div className="border rounded-lg divide-y">
        {children}
      </div>
    </div>
  )
}

interface ProfileRowProps {
  label: string
  children: React.ReactNode
}

function ProfileRow({ label, children }: ProfileRowProps) {
  return (
    <div className="flex items-center px-4 py-2.5 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function formatGender(gender: string): string {
  const mapping: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    non_binary: 'Non-Binary',
    prefer_not_to_say: 'Prefer not to say',
    other: 'Other',
  }
  return mapping[gender] || gender
}

function formatAttributeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
