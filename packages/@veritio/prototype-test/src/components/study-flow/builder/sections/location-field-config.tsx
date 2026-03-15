'use client'

import { useState, useEffect } from 'react'
import { Label } from '@veritio/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { SearchableSelect } from '@veritio/ui/components/searchable-select'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { getAllCountries, getStatesByCountry } from '@/lib/location-data'
import type { LocationFieldConfig, DemographicProfileSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface LocationFieldAdvancedConfigProps {
  config: DemographicProfileSettings
}
export function LocationFieldAdvancedConfig({ config }: LocationFieldAdvancedConfigProps) {
  const { updateIdentifierSettings } = useStudyFlowBuilderStore()

  if (!config?.locationConfig) return null

  const updateLocationConfig = (updates: Partial<LocationFieldConfig>) => {
    updateIdentifierSettings({
      demographicProfile: {
        ...config,
        locationConfig: { ...config.locationConfig, ...updates }
      }
    })
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/10 space-y-3">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Start From</Label>
        <Select
          value={config.locationConfig.startLevel}
          onValueChange={(val) =>
            updateLocationConfig({
              startLevel: val as 'country' | 'state' | 'city',
              // Reset defaults when changing start level
              defaultCountry: null,
              defaultState: null,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="country">Country (Full cascade: Country → State → City)</SelectItem>
            <SelectItem value="state">State (State → City only)</SelectItem>
            <SelectItem value="city">City (City only)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose where the location selection begins. Use "State" or "City" for studies targeting a specific region.
        </p>
      </div>

      {/* Default Country Selector (for state/city start levels) */}
      {(config.locationConfig.startLevel === 'state' || config.locationConfig.startLevel === 'city') && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Country</Label>
          <CountrySelector
            value={config.locationConfig.defaultCountry || ''}
            onChange={(val) =>
              updateLocationConfig({
                defaultCountry: val,
                defaultState: null, // Reset state when country changes
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Pre-select a country to filter states/cities
          </p>
        </div>
      )}

      {/* Default State Selector (for city start level) */}
      {config.locationConfig.startLevel === 'city' && config.locationConfig.defaultCountry && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default State</Label>
          <StateSelector
            countryCode={config.locationConfig.defaultCountry}
            value={config.locationConfig.defaultState || ''}
            onChange={(val) => updateLocationConfig({ defaultState: val })}
          />
          <p className="text-xs text-muted-foreground">
            Pre-select a state to filter cities
          </p>
        </div>
      )}
    </div>
  )
}
// Helper Components

interface CountrySelectorProps {
  value: string
  onChange: (val: string) => void
}
function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [countries, setCountries] = useState<Awaited<ReturnType<typeof getAllCountries>>>([])

  useEffect(() => {
    getAllCountries().then(setCountries)
  }, [])

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      placeholder="Select country"
      searchPlaceholder="Search countries..."
      options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
    />
  )
}

interface StateSelectorProps {
  countryCode: string
  value: string
  onChange: (val: string) => void
}
function StateSelector({ countryCode, value, onChange }: StateSelectorProps) {
  const [states, setStates] = useState<Awaited<ReturnType<typeof getStatesByCountry>>>([])

  useEffect(() => {
    if (countryCode) {
      getStatesByCountry(countryCode).then(setStates)
    } else {
      setStates([])
    }
  }, [countryCode])

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      placeholder="Select state"
      searchPlaceholder="Search states..."
      options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
    />
  )
}
