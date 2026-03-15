'use client'

import { memo, useState, useEffect, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { getAllCountries, getStatesByCountry, getCitiesByState } from '@/lib/location-data'
import { getFieldLabel } from '@/lib/demographic-utils'
import type {
  DemographicField,
  LocationFieldConfig,
  ParticipantDemographicData,
} from '@veritio/study-types/study-flow-types'

export interface LocationCascadeFieldProps {
  config: DemographicField
  locationConfig: LocationFieldConfig
  value: ParticipantDemographicData['location']
  onChange: (location: ParticipantDemographicData['location']) => void
  required: boolean
  error?: string
}

export const LocationCascadeField = memo(function LocationCascadeField({
  config,
  locationConfig,
  value,
  onChange,
  required,
  error,
}: LocationCascadeFieldProps) {
  const { startLevel, defaultCountry, defaultState } = locationConfig

  // State for cascading selects
  const [selectedCountry, setSelectedCountry] = useState<string>(value?.countryCode || defaultCountry || '')
  const [selectedState, setSelectedState] = useState<string>(value?.stateCode || defaultState || '')
  const [selectedCity, setSelectedCity] = useState<string>(value?.city || '')

  // Available options based on selections
  const [countries, setCountries] = useState<Awaited<ReturnType<typeof getAllCountries>>>([])
  const [states, setStates] = useState<Awaited<ReturnType<typeof getStatesByCountry>>>([])
  const [cities, setCities] = useState<Awaited<ReturnType<typeof getCitiesByState>>>([])

  // Load countries on mount
  useEffect(() => {
    getAllCountries().then(setCountries)
  }, [])

  // Load states when country changes
  useEffect(() => {
    if (selectedCountry) {
      getStatesByCountry(selectedCountry).then(setStates)
    } else {
      setStates([]) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [selectedCountry])

  // Load cities when state changes
  useEffect(() => {
    if (selectedCountry && selectedState) {
      getCitiesByState(selectedCountry, selectedState).then(setCities)
    } else {
      setCities([]) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [selectedCountry, selectedState])

  const handleCountryChange = useCallback(
    (countryCode: string) => {
      const country = countries.find((c) => c.isoCode === countryCode)
      setSelectedCountry(countryCode)
      setSelectedState('')
      setSelectedCity('')
      onChange({
        country: country?.name,
        countryCode: countryCode,
        state: undefined,
        stateCode: undefined,
        city: undefined,
      })
    },
    [countries, onChange]
  )

  const handleStateChange = useCallback(
    (stateCode: string) => {
      const state = states.find((s) => s.isoCode === stateCode)
      setSelectedState(stateCode)
      setSelectedCity('')
      onChange({
        ...value,
        state: state?.name,
        stateCode: stateCode,
        city: undefined,
      })
    },
    [states, value, onChange]
  )

  const handleCityChange = useCallback(
    (cityName: string) => {
      setSelectedCity(cityName)
      onChange({ ...value, city: cityName })
    },
    [value, onChange]
  )

  return (
    <div className="space-y-3 md:col-span-2">
      <Label>
        {getFieldLabel(config)}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {startLevel === 'country' && (
        <SearchableSelect
          value={selectedCountry}
          onValueChange={handleCountryChange}
          placeholder="Country..."
          searchPlaceholder="Search countries..."
          options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
          className="w-full"
        />
      )}

      {(startLevel === 'country' || startLevel === 'state') && (
        <SearchableSelect
          value={selectedState}
          onValueChange={handleStateChange}
          disabled={startLevel === 'country' && !selectedCountry}
          placeholder="State/Region..."
          searchPlaceholder="Search states..."
          options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
          className="w-full"
        />
      )}

      <SearchableSelect
        value={selectedCity}
        onValueChange={handleCityChange}
        disabled={(startLevel !== 'city' && !selectedState) || cities.length === 0}
        placeholder="City..."
        searchPlaceholder="Search cities..."
        options={cities.map((c) => ({ value: c.name, label: c.name }))}
        className="w-full"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
})
