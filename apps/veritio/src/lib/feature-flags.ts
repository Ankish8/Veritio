/**
 * Client/server feature flags.
 *
 * Keep these as plain module constants so toggling a feature is a one-line
 * change and dead code stays type-checked (never delete the gated code).
 */

/**
 * Figma import. Temporarily re-enabled for in-progress polish work: this turns
 * the connect + import/sync flows back on across the design-image picker and
 * the prototype-test settings panel. Flip to `false` to surface the
 * "Coming soon" states again (all gated code stays intact either way).
 */
export const FIGMA_IMPORT_ENABLED: boolean = true
