/**
 * Client-side browser detection utility
 * Captures browser, OS, device type, and other environment information
 * for participant demographics.
 */

export interface GeoLocation {
  country?: string | null
  countryCode?: string | null
  region?: string | null
  city?: string | null
  timezone?: string | null
}

export interface BrowserData {
  browser: string
  operatingSystem: string
  deviceType: 'Desktop' | 'Mobile' | 'Tablet'
  language: string
  timeZone: string
  screenResolution: string
  geoLocation?: GeoLocation | null
}

/**
 * Detects the browser name from user agent
 */
function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown'

  const ua = navigator.userAgent
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome'
  if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari'
  if (ua.indexOf('Firefox') > -1) return 'Firefox'
  if (ua.indexOf('Edg') > -1) return 'Edge'
  if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera'
  return 'Other'
}

/**
 * Detects the operating system from user agent
 */
function getOperatingSystem(): string {
  if (typeof navigator === 'undefined') return 'Unknown'

  const ua = navigator.userAgent
  if (ua.indexOf('Windows') > -1) return 'Windows'
  if (ua.indexOf('Mac OS') > -1 || ua.indexOf('Macintosh') > -1) return 'macOS'
  if (ua.indexOf('Android') > -1) return 'Android'
  if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS'
  if (ua.indexOf('Linux') > -1) return 'Linux'
  if (ua.indexOf('CrOS') > -1) return 'Chrome OS'
  return 'Other'
}

/**
 * Detects device type (Desktop, Mobile, Tablet) from user agent
 */
function getDeviceType(): 'Desktop' | 'Mobile' | 'Tablet' {
  if (typeof navigator === 'undefined') return 'Desktop'

  const ua = navigator.userAgent
  if (/Mobi|Android|iPhone|iPod/i.test(ua) && !/iPad|Tablet/i.test(ua)) return 'Mobile'
  if (/iPad|Tablet/i.test(ua)) return 'Tablet'
  return 'Desktop'
}

/**
 * Gets the browser's preferred language
 */
function getLanguage(): string {
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language || 'en'
}

/**
 * Gets the user's timezone
 */
function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

/**
 * Gets screen resolution
 */
function getScreenResolution(): string {
  if (typeof screen === 'undefined') return 'Unknown'
  return `${screen.width}x${screen.height}`
}

/**
 * Fetches geolocation data from ipapi.co (free, client-side)
 * Returns null on error or timeout
 */
async function fetchGeoLocation(): Promise<GeoLocation | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) return null

    const data = await response.json()
    return {
      country: data.country_name || null,
      countryCode: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      timezone: data.timezone || null,
    }
  } catch {
    return null
  }
}

/**
 * Module-level geo promise cache — starts the lookup once and reuses the promise.
 * Call warmupGeoLookup() early (e.g. on page mount) so the result is ready by
 * the time startSession() is called (after the user reads the welcome/instructions).
 */
let _cachedGeoPromise: Promise<GeoLocation | null> | null = null

/**
 * Fire-and-forget: starts the geo lookup immediately and caches the promise.
 * Safe to call multiple times — only one request is ever made.
 */
export function warmupGeoLookup(): void {
  if (!_cachedGeoPromise && typeof window !== 'undefined') {
    _cachedGeoPromise = fetchGeoLocation()
  }
}

/**
 * Collects all browser data in one call (sync, no geo)
 * Should only be called on the client side
 */
export function getBrowserData(): BrowserData {
  return {
    browser: getBrowser(),
    operatingSystem: getOperatingSystem(),
    deviceType: getDeviceType(),
    language: getLanguage(),
    timeZone: getTimeZone(),
    screenResolution: getScreenResolution(),
  }
}

/**
 * Collects all browser data including geolocation (async).
 * Uses the cached geo promise if warmupGeoLookup() was called earlier,
 * so there is typically zero additional wait time.
 * Should only be called on the client side.
 */
export async function getBrowserDataWithGeo(): Promise<BrowserData> {
  const geoLocation = await (_cachedGeoPromise ?? fetchGeoLocation())

  return {
    browser: getBrowser(),
    operatingSystem: getOperatingSystem(),
    deviceType: getDeviceType(),
    language: getLanguage(),
    timeZone: getTimeZone(),
    screenResolution: getScreenResolution(),
    geoLocation,
  }
}
