'use client'

import { useMemo } from 'react'
import { MapPin } from 'lucide-react'

interface LocationDisplayProps {
  participants: { country?: string | null; region?: string | null }[]
}

export function LocationDisplay({ participants }: LocationDisplayProps) {
  const locationData = useMemo(() => {
    if (!participants || participants.length === 0) return []

    // Group by location (country + region if US)
    const locationCounts: Record<string, number> = {}
    let totalWithLocation = 0

    participants.forEach(p => {
      const country = p.country
      const region = p.region

      if (country) {
        totalWithLocation++
        // For US, show state; for others show country
        const location = country === 'United States' && region
          ? `${region}, US`
          : country
        locationCounts[location] = (locationCounts[location] || 0) + 1
      }
    })

    if (totalWithLocation === 0) return []

    return Object.entries(locationCounts)
      .map(([location, count]) => ({
        location,
        count,
        percentage: Math.round((count / totalWithLocation) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3) // Top 3 locations
  }, [participants])

  if (locationData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Waiting for participants from all corners of the globe to complete your study.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-2">
      {locationData.map((loc, i) => (
        <div key={loc.location} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>
              {loc.location}
            </span>
          </div>
          <span className={`text-sm font-medium ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {loc.percentage}%
          </span>
        </div>
      ))}
    </div>
  )
}
