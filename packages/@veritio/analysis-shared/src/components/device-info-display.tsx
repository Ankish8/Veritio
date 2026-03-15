'use client'
import { useMemo } from 'react'
import { Monitor, Smartphone, Tablet, Globe, MapPin } from 'lucide-react'
import type { Participant } from '@veritio/core'

// Browser data type from participant metadata
interface BrowserData {
  browser?: string
  operatingSystem?: string
  deviceType?: 'Desktop' | 'Mobile' | 'Tablet'
  language?: string
  timeZone?: string
  screenResolution?: string
  geoLocation?: {
    country?: string | null
    region?: string | null
    city?: string | null
  }
}

interface ParticipantWithMetadata extends Omit<Participant, 'metadata'> {
  metadata?: {
    browserData?: BrowserData
  } | null
}

interface DeviceInfoDisplayProps {
  participants: ParticipantWithMetadata[]
}

interface AggregatedField {
  items: { label: string; count: number; percentage: number }[]
  totalCount: number
}

interface AggregatedStats {
  devices: AggregatedField
  browsers: AggregatedField
  os: AggregatedField
  locations: AggregatedField
}

// Device type icons
const DEVICE_ICONS: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-4 w-4" />,
  Mobile: <Smartphone className="h-4 w-4" />,
  Tablet: <Tablet className="h-4 w-4" />,
}

function aggregateField(
  items: string[],
  maxItems: number = 3
): AggregatedField {
  const counts: Record<string, number> = {}
  items.forEach((item) => {
    if (item) {
      counts[item] = (counts[item] || 0) + 1
    }
  })

  const total = items.filter(Boolean).length
  if (total === 0) return { items: [], totalCount: 0 }

  const sorted = Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  return {
    items: sorted.slice(0, maxItems),
    totalCount: sorted.length,
  }
}

export function DeviceInfoDisplay({ participants }: DeviceInfoDisplayProps) {
  const stats = useMemo<AggregatedStats>(() => {
    const empty: AggregatedField = { items: [], totalCount: 0 }
    if (!participants || participants.length === 0) {
      return { devices: empty, browsers: empty, os: empty, locations: empty }
    }

    const deviceTypes: string[] = []
    const browsers: string[] = []
    const operatingSystems: string[] = []
    const locations: string[] = []

    participants.forEach((p) => {
      const browserData = p.metadata?.browserData

      if (browserData?.deviceType) {
        deviceTypes.push(browserData.deviceType)
      }
      if (browserData?.browser) {
        browsers.push(browserData.browser)
      }
      if (browserData?.operatingSystem) {
        operatingSystems.push(browserData.operatingSystem)
      }

      // Get location from direct fields or browserData.geoLocation
      const country = p.country || browserData?.geoLocation?.country
      const region = p.region || browserData?.geoLocation?.region
      const _city = p.city || browserData?.geoLocation?.city

      if (country) {
        // For US, show state; for others show country
        const location =
          country === 'United States' && region ? `${region}, US` : country
        locations.push(location)
      }
    })

    return {
      devices: aggregateField(deviceTypes),
      browsers: aggregateField(browsers),
      os: aggregateField(operatingSystems),
      locations: aggregateField(locations),
    }
  }, [participants])

  const hasData =
    stats.devices.items.length > 0 ||
    stats.browsers.items.length > 0 ||
    stats.os.items.length > 0 ||
    stats.locations.items.length > 0

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Monitor className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Waiting for participants to complete your study.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
      {/* Device Types */}
      {stats.devices.items.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Devices</h4>
          <div className="space-y-1.5">
            {stats.devices.items.map((item, i) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-muted-foreground ${i === 0 ? 'text-primary' : ''}`}>
                    {DEVICE_ICONS[item.label] || <Monitor className="h-4 w-4" />}
                  </span>
                  <span className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
                <span className={`text-sm font-medium ${i === 0 ? '' : 'text-muted-foreground'}`}>
                  {item.percentage}%
                </span>
              </div>
            ))}
            {stats.devices.totalCount > stats.devices.items.length && (
              <p className="text-xs text-muted-foreground/70">+{stats.devices.totalCount - stats.devices.items.length} more</p>
            )}
          </div>
        </div>
      )}

      {/* Browsers */}
      {stats.browsers.items.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Browsers</h4>
          <div className="space-y-1.5">
            {stats.browsers.items.map((item, i) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className={`h-4 w-4 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
                <span className={`text-sm font-medium ${i === 0 ? '' : 'text-muted-foreground'}`}>
                  {item.percentage}%
                </span>
              </div>
            ))}
            {stats.browsers.totalCount > stats.browsers.items.length && (
              <p className="text-xs text-muted-foreground/70">+{stats.browsers.totalCount - stats.browsers.items.length} more</p>
            )}
          </div>
        </div>
      )}

      {/* Operating Systems */}
      {stats.os.items.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Operating Systems</h4>
          <div className="space-y-1.5">
            {stats.os.items.map((item, i) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className={`h-4 w-4 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
                <span className={`text-sm font-medium ${i === 0 ? '' : 'text-muted-foreground'}`}>
                  {item.percentage}%
                </span>
              </div>
            ))}
            {stats.os.totalCount > stats.os.items.length && (
              <p className="text-xs text-muted-foreground/70">+{stats.os.totalCount - stats.os.items.length} more</p>
            )}
          </div>
        </div>
      )}

      {/* Locations */}
      {stats.locations.items.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Locations</h4>
          <div className="space-y-1.5">
            {stats.locations.items.map((item, i) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className={`h-4 w-4 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </div>
                <span className={`text-sm font-medium ${i === 0 ? '' : 'text-muted-foreground'}`}>
                  {item.percentage}%
                </span>
              </div>
            ))}
            {stats.locations.totalCount > stats.locations.items.length && (
              <p className="text-xs text-muted-foreground/70">+{stats.locations.totalCount - stats.locations.items.length} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
