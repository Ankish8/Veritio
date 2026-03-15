/**
 * Widget Loader Module - Barrel Export
 *
 * Exports all types and the main generateLoaderScript function.
 */

// Types
export type {
  LoaderConfig,
  WidgetConfig,
  WidgetBranding,
  FrequencyCappingConfig,
  CaptureSettingsConfig,
  DemographicFieldConfig,
  TargetingConfig,
  SchedulingConfig,
  PrivacyConfig,
  CookieConsentConfig,
  AdvancedTriggersConfig,
  TriggerRule,
  PlacementConfig,
  CopyPersonalizationConfig,
  PersonalizationRule,
  NormalizedDemographicField,
  ThemeColors,
} from './types'

// Constants
export { RADIUS_MAP, DEMOGRAPHIC_OPTIONS, TIME_WINDOW_MS } from './constants'

// Escaping utilities
export { escapeJs, generateEscapeHtmlFunction, generateContrastColorFunction } from './escaping'

// Main generators
export { generateLoaderScript } from './generate-loader-script'
export { generateV3LoaderScript } from './generate-v3-loader-script'
