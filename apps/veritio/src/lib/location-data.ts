/**
 * Location data utilities with dynamic imports
 *
 * The country-state-city package is ~8MB of geographic data.
 * We use dynamic imports to only load this data when actually needed,
 * rather than bundling it into the initial JavaScript payload.
 */

// Type definitions for the data structures
export interface CountryData {
  name: string
  isoCode: string
}

export interface StateData {
  name: string
  isoCode: string
}

export interface CityData {
  name: string
}

// Lazy-load the country-state-city module
const getCountryStateCity = () => import('country-state-city')

/**
 * Get all countries with their ISO codes
 * Returns sorted by name for better UX
 */
export async function getAllCountries(): Promise<CountryData[]> {
  const { Country } = await getCountryStateCity()
  return Country.getAllCountries()
    .map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get states for a specific country
 * @param countryCode - ISO country code (e.g., "US")
 */
export async function getStatesByCountry(countryCode: string): Promise<StateData[]> {
  const { State } = await getCountryStateCity()
  return State.getStatesOfCountry(countryCode)
    .map((s) => ({
      name: s.name,
      isoCode: s.isoCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get cities for a specific state
 * @param countryCode - ISO country code (e.g., "US")
 * @param stateCode - ISO state code (e.g., "CA")
 */
export async function getCitiesByState(countryCode: string, stateCode: string): Promise<CityData[]> {
  const { City } = await getCountryStateCity()
  return City.getCitiesOfState(countryCode, stateCode)
    .map((c) => ({
      name: c.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
