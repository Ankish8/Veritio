/**
 * String Escaping Utilities
 *
 * Utilities for escaping strings in different contexts within the generated
 * loader script. There are multiple escaping contexts:
 * - JavaScript string literals (escapeJs)
 * - JSON within JavaScript (JSON.stringify handles this)
 * - HTML within JavaScript strings (escapeHtml - generated as inline function)
 */

/**
 * Escape a string for use within a JavaScript single-quoted string literal.
 * This handles backslashes, single quotes, and newlines.
 */
export function escapeJs(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

/**
 * Generate the inline HTML escape function for use in the browser.
 * This is included in the generated script as a helper function.
 */
export function generateEscapeHtmlFunction(): string {
  return `function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }`
}

/**
 * Generate the contrast color calculator function for use in the browser.
 * Determines whether to use black or white text based on background luminance.
 */
export function generateContrastColorFunction(): string {
  return `function getContrastColor(hex) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.5 ? '#000' : '#fff';
  }`
}
