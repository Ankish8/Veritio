'use client'

/**
 * Keyboard Shortcuts Utility Functions
 *
 * Provides helpers for:
 * - Key event matching (single keys, combos, sequences)
 * - Platform detection (Mac vs Windows/Linux)
 * - Key normalization and display formatting
 */

/**
 * Detects if the current platform is macOS
 */
export function isMac(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

/**
 * Gets the appropriate modifier key symbol for the current platform
 * Mac: ⌘ (Command)
 * Windows/Linux: Ctrl
 */
export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl'
}

/**
 * Normalizes a key string to a consistent format.
 * Handles platform-specific mappings (⌘ <-> Ctrl)
 */
export function normalizeKey(key: string): string {
  const keyLower = key.toLowerCase()

  // Handle modifier key aliases
  const modifierMap: Record<string, string> = {
    '⌘': isMac() ? 'meta' : 'ctrl',
    'cmd': isMac() ? 'meta' : 'ctrl',
    'command': isMac() ? 'meta' : 'ctrl',
    'ctrl': 'ctrl',
    'control': 'ctrl',
    'alt': 'alt',
    'option': 'alt',
    '⌥': 'alt',
    'shift': 'shift',
    '⇧': 'shift',
  }

  if (modifierMap[keyLower]) {
    return modifierMap[keyLower]
  }

  // Handle special keys
  const specialKeyMap: Record<string, string> = {
    'enter': 'enter',
    'return': 'enter',
    'esc': 'escape',
    'escape': 'escape',
    'space': ' ',
    'spacebar': ' ',
    'tab': 'tab',
    'backspace': 'backspace',
    'delete': 'delete',
    'del': 'delete',
    'arrowup': 'arrowup',
    'arrowdown': 'arrowdown',
    'arrowleft': 'arrowleft',
    'arrowright': 'arrowright',
    '↑': 'arrowup',
    '↓': 'arrowdown',
    '←': 'arrowleft',
    '→': 'arrowright',
  }

  if (specialKeyMap[keyLower]) {
    return specialKeyMap[keyLower]
  }

  // Return lowercase for regular keys
  return keyLower
}

/**
 * Gets the normalized key from a KeyboardEvent
 */
export function getEventKey(e: KeyboardEvent): string {
  // For letters, use the key directly (handles shift automatically)
  if (e.key.length === 1) {
    return e.key.toLowerCase()
  }

  return e.key.toLowerCase()
}

/**
 * Checks if the given modifier keys match the event
 */
function modifiersMatch(e: KeyboardEvent, keys: string[]): boolean {
  const normalizedKeys = keys.map(normalizeKey)

  const needsMeta = normalizedKeys.includes('meta')
  const needsCtrl = normalizedKeys.includes('ctrl')
  const needsAlt = normalizedKeys.includes('alt')
  const needsShift = normalizedKeys.includes('shift')

  // On Mac, check metaKey for ⌘
  // On Windows/Linux, check ctrlKey for Ctrl
  const metaOrCtrl = isMac() ? e.metaKey : e.ctrlKey

  if (needsMeta || needsCtrl) {
    if (!metaOrCtrl) return false
  } else {
    if (metaOrCtrl) return false
  }

  if (needsAlt !== e.altKey) return false
  if (needsShift !== e.shiftKey) return false

  return true
}

/**
 * Checks if a single key combo (e.g., ['⌘', 'K'] or ['G']) matches the event
 */
export function matchesKeyCombo(e: KeyboardEvent, combo: string[]): boolean {
  if (combo.length === 0) return false

  // Find the non-modifier key in the combo
  const modifierNames = ['meta', 'ctrl', 'alt', 'shift', '⌘', 'cmd', 'command', 'control', '⌥', 'option', '⇧']
  const nonModifierKeys = combo.filter(k => !modifierNames.includes(normalizeKey(k)))

  if (nonModifierKeys.length === 0) {
    // Combo is only modifiers (edge case)
    return false
  }

  // Check if the pressed key matches any non-modifier in the combo
  const pressedKey = getEventKey(e)
  const keyMatches = nonModifierKeys.some(k => normalizeKey(k) === pressedKey)

  if (!keyMatches) return false

  // Check modifiers
  return modifiersMatch(e, combo)
}

/**
 * Checks if a key sequence (e.g., [['G'], ['D']]) matches the current buffer + event
 */
export function matchesKeySequence(
  e: KeyboardEvent,
  sequence: string[][],
  currentBuffer: string[]
): { matches: boolean; isComplete: boolean } {
  if (sequence.length === 0) {
    return { matches: false, isComplete: false }
  }

  // Single key combo (not a sequence)
  if (sequence.length === 1) {
    const matches = matchesKeyCombo(e, sequence[0])
    return { matches, isComplete: matches }
  }

  // Multi-key sequence
  const expectedIndex = currentBuffer.length
  if (expectedIndex >= sequence.length) {
    // Buffer overflow, shouldn't happen
    return { matches: false, isComplete: false }
  }

  // Check if current key matches expected key in sequence
  const expectedCombo = sequence[expectedIndex]
  const currentMatches = matchesKeyCombo(e, expectedCombo)

  if (!currentMatches) {
    return { matches: false, isComplete: false }
  }

  // Current key matches - check if sequence is now complete
  const isComplete = expectedIndex === sequence.length - 1

  return { matches: true, isComplete }
}

/**
 * Checks if the event target is an input element that should block shortcuts
 */
export function isInputElement(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement
  if (!target) return false

  const tagName = target.tagName.toLowerCase()

  // Standard form elements
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }

  // Contenteditable elements
  if (target.isContentEditable) {
    return true
  }

  // Check for Radix UI primitives that might need keyboard input
  if (target.getAttribute('role') === 'textbox') {
    return true
  }

  return false
}

/**
 * Checks if a modal or dialog is currently open that should block global shortcuts.
 * Note: We specifically check for dialogs/modals, NOT tooltips or dropdowns,
 * as those shouldn't block keyboard shortcuts.
 */
export function isOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false

  // Check for dialog elements (native HTML dialog)
  const dialog = document.querySelector('dialog[open]')
  if (dialog) return true

  // Check for Radix UI dialog specifically (not tooltips or popovers)
  // Radix dialogs have role="dialog" and aria-modal="true"
  const radixDialog = document.querySelector('[data-radix-dialog-content]')
  if (radixDialog) return true

  // Check for Radix AlertDialog
  const alertDialog = document.querySelector('[data-radix-alert-dialog-content]')
  if (alertDialog) return true

  // Check for common modal class names (only true modals, not panels)
  const modal = document.querySelector('[role="dialog"][aria-modal="true"]')
  if (modal) return true

  return false
}

/**
 * Converts a key combo array to display format
 * e.g., ['⌘', 'K'] stays as is, ['ctrl', 'k'] becomes ['Ctrl', 'K']
 */
export function formatKeyForDisplay(key: string): string {
  const displayMap: Record<string, string> = {
    'meta': '⌘',
    'ctrl': 'Ctrl',
    'alt': isMac() ? '⌥' : 'Alt',
    'shift': '⇧',
    'enter': 'Enter',
    'escape': 'Esc',
    'backspace': '⌫',
    'delete': 'Del',
    'tab': 'Tab',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    ' ': 'Space',
  }

  const normalized = normalizeKey(key)
  if (displayMap[normalized]) {
    return displayMap[normalized]
  }

  // Capitalize single letters
  if (key.length === 1) {
    return key.toUpperCase()
  }

  return key
}

/**
 * Gets the sequence buffer key from a key combo
 * Used to build the sequence buffer for multi-key shortcuts
 */
export function getBufferKey(combo: string[]): string {
  const modifierNames = ['meta', 'ctrl', 'alt', 'shift', '⌘', 'cmd', 'command', 'control', '⌥', 'option', '⇧']
  const nonModifiers = combo.filter(k => !modifierNames.includes(normalizeKey(k)))
  return nonModifiers[0]?.toLowerCase() || ''
}
