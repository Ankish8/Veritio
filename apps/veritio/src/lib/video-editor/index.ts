/**
 * Video Editor Library Index
 *
 * Central export point for all video editor functionality.
 * This library provides a professional NLE (Non-Linear Editor) experience
 * for UX research recordings.
 */

// Core types
export * from './types'

// Track system
export * from './tracks/index'

// Command pattern for undo/redo
export * from './commands/index'

// Tool system
export * from './tools/index'

// Snap engine
export { SnapEngine } from './snap-engine'
