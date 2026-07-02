/**
 * Client/server feature flags.
 *
 * Keep these as plain module constants so toggling a feature is a one-line
 * change and dead code stays type-checked (never delete the gated code).
 */

/**
 * Figma import is temporarily disabled and surfaced as "Coming soon" across the
 * design-image picker and the prototype-test settings panel. Flip to `true` to
 * re-enable the connect + import/sync flows (all supporting code is kept intact
 * behind this flag).
 */
export const FIGMA_IMPORT_ENABLED: boolean = false
