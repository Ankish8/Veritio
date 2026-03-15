'use client'

import type { ReactNode } from 'react'
import { Button } from '@veritio/ui/components/button'
import { Badge } from '@veritio/ui/components/badge'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  XCircle,
  User,
  MapPin,
  Briefcase,
  Monitor,
  GraduationCap,
} from 'lucide-react'
import { formatTime, formatDate } from '@veritio/ui'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/core'
import { resolveParticipantDisplay } from '../../lib/utils/participant-display'

export interface ParticipantSummaryStats {
  questionsAnswered: number
  questionsTotal: number
  completionPercent: number
  timeTakenMs: number | null
  status: string
  startedAt: Date
  completedAt: Date | null
}

export interface ParticipantDetailPanelProps {
  participantIndex: number
  identifier: string | null
  participantId: string
  stats: ParticipantSummaryStats
  demographics?: ParticipantDemographicData | null
  urlTags?: Record<string, string> | null
  isExcluded: boolean
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  canNavigatePrev: boolean
  canNavigateNext: boolean
  onToggleExclude?: (exclude: boolean) => void
  displaySettings?: ParticipantDisplaySettings | null
  hideDefaultStats?: boolean
  children?: ReactNode
}

export function ParticipantDetailPanel({
  participantIndex,
  identifier: _identifier,
  participantId: _participantId,
  stats,
  demographics,
  urlTags,
  isExcluded,
  onClose,
  onNavigate,
  canNavigatePrev,
  canNavigateNext,
  onToggleExclude,
  displaySettings,
  hideDefaultStats = false,
  children,
}: ParticipantDetailPanelProps) {
  const hasAnyDemographics = demographics && Object.keys(demographics).some(
    key => key !== '_sources' && demographics[key as keyof ParticipantDemographicData]
  )

  const display = resolveParticipantDisplay(displaySettings ?? null, {
    index: participantIndex,
    demographics,
  })

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Sticky Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background min-w-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate('prev')}
            disabled={!canNavigatePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">{display.primary}</h2>
            {display.secondary && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {display.secondary}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onNavigate('next')}
            disabled={!canNavigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
        <div className="p-4 space-y-6 w-full min-w-0">
          {/* Summary Stats - hidden when study type renders custom stats */}
          {!hideDefaultStats && (
            <div className="grid grid-cols-2 gap-3 overflow-hidden w-full">
              <StatCard
                value={`${stats.questionsAnswered}/${stats.questionsTotal}`}
                label="Answered"
              />
              <StatCard
                value={`${stats.completionPercent}%`}
                label="Completion"
              />
              <StatCard
                value={formatTime(stats.timeTakenMs)}
                label="Time Taken"
              />
              <StatCard
                icon={
                  stats.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : stats.status === 'in_progress' ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )
                }
                label={stats.status.replace('_', ' ')}
              />
            </div>
          )}

          {/* Status & Dates */}
          <Section title="Session Info" withCard>
            <InfoGrid>
              <InfoItem label="Started" value={formatDate(stats.startedAt.toISOString())} />
              <InfoItem
                label="Completed"
                value={stats.completedAt ? formatDate(stats.completedAt.toISOString()) : '—'}
              />
              <InfoItem
                label="Analysis"
                value={
                  isExcluded ? (
                    <Badge variant="secondary" className="text-xs">Excluded</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 text-xs">Included</Badge>
                  )
                }
              />
            </InfoGrid>
          </Section>

          {/* Demographics */}
          {hasAnyDemographics && (
            <Section title="Participant Profile" icon={<User className="h-4 w-4" />}>
              <div className="space-y-4">
                {/* Basic Demographics */}
                <DemographicGroup title="Personal" icon={<User className="h-3.5 w-3.5" />}>
                  {demographics?.firstName && (
                    <InfoItem label="Name" value={`${demographics.firstName} ${demographics.lastName || ''}`} />
                  )}
                  {demographics?.email && <InfoItem label="Email" value={demographics.email} />}
                  {demographics?.gender && <InfoItem label="Gender" value={demographics.gender} />}
                  {demographics?.ageRange && <InfoItem label="Age" value={demographics.ageRange} />}
                  {demographics?.maritalStatus && <InfoItem label="Marital Status" value={demographics.maritalStatus} />}
                  {demographics?.householdSize && <InfoItem label="Household" value={demographics.householdSize} />}
                </DemographicGroup>

                {/* Location */}
                {demographics?.location && (
                  <DemographicGroup title="Location" icon={<MapPin className="h-3.5 w-3.5" />}>
                    {demographics.location.city && <InfoItem label="City" value={demographics.location.city} />}
                    {demographics.location.state && <InfoItem label="State" value={demographics.location.state} />}
                    {demographics.location.country && <InfoItem label="Country" value={demographics.location.country} />}
                  </DemographicGroup>
                )}

                {/* Professional */}
                {(demographics?.employmentStatus || demographics?.jobTitle || demographics?.industry) && (
                  <DemographicGroup title="Professional" icon={<Briefcase className="h-3.5 w-3.5" />}>
                    {demographics?.employmentStatus && <InfoItem label="Employment" value={demographics.employmentStatus} />}
                    {demographics?.jobTitle && <InfoItem label="Job Title" value={demographics.jobTitle} />}
                    {demographics?.industry && <InfoItem label="Industry" value={demographics.industry} />}
                    {demographics?.companySize && <InfoItem label="Company Size" value={demographics.companySize} />}
                    {demographics?.yearsOfExperience && <InfoItem label="Experience" value={demographics.yearsOfExperience} />}
                    {demographics?.department && <InfoItem label="Department" value={demographics.department} />}
                  </DemographicGroup>
                )}

                {/* Technology */}
                {(demographics?.primaryDevice || demographics?.operatingSystem || demographics?.browserPreference) && (
                  <DemographicGroup title="Technology" icon={<Monitor className="h-3.5 w-3.5" />}>
                    {demographics?.primaryDevice && <InfoItem label="Device" value={demographics.primaryDevice} />}
                    {demographics?.operatingSystem && <InfoItem label="OS" value={demographics.operatingSystem} />}
                    {demographics?.browserPreference && <InfoItem label="Browser" value={demographics.browserPreference} />}
                    {demographics?.techProficiency && <InfoItem label="Tech Level" value={demographics.techProficiency} />}
                  </DemographicGroup>
                )}

                {/* Education */}
                {(demographics?.educationLevel || demographics?.occupationType) && (
                  <DemographicGroup title="Background" icon={<GraduationCap className="h-3.5 w-3.5" />}>
                    {demographics?.educationLevel && <InfoItem label="Education" value={demographics.educationLevel} />}
                    {demographics?.occupationType && <InfoItem label="Occupation" value={demographics.occupationType} />}
                    {demographics?.locationType && <InfoItem label="Area" value={demographics.locationType} />}
                  </DemographicGroup>
                )}
              </div>
            </Section>
          )}

          {/* URL Tags */}
          {urlTags && Object.keys(urlTags).length > 0 && (
            <Section title="URL Tags" withCard>
              <div className="flex flex-wrap gap-2">
                {Object.entries(urlTags).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Question Responses - passed as children */}
          {children}
        </div>
      </div>

      {/* Footer with exclude toggle */}
      {onToggleExclude && (
        <div className="border-t p-4 bg-background">
          <Button
            variant={isExcluded ? 'default' : 'outline'}
            className="w-full"
            onClick={() => onToggleExclude(!isExcluded)}
          >
            {isExcluded ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Include in Analysis
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Exclude from Analysis
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, icon }: { value?: string; label: string; icon?: ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center overflow-hidden min-w-0">
      {icon ? (
        <div className="flex justify-center">{icon}</div>
      ) : (
        <div className="text-lg font-semibold truncate">{value}</div>
      )}
      <div className="text-xs text-muted-foreground mt-1 capitalize truncate">{label}</div>
    </div>
  )
}

function Section({ title, icon, children, withCard = false }: { title: string; icon?: ReactNode; children: ReactNode; withCard?: boolean }) {
  return (
    <div className="space-y-3 pt-4 first:pt-0 border-t first:border-t-0 border-border/50">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {withCard ? (
        <div className="bg-muted/30 rounded-lg border border-border/50 p-3">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm overflow-hidden">{children}</div>
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null
  return (
    <div className="flex flex-col overflow-hidden min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  )
}

function DemographicGroup({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const validChildren = (children as ReactNode[])?.filter?.(Boolean)
  if (!validChildren || validChildren.length === 0) return null

  return (
    <div className="bg-muted/30 rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        {icon}
        <span>{title}</span>
      </div>
      <InfoGrid>{children}</InfoGrid>
    </div>
  )
}
