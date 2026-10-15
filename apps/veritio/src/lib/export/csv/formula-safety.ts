/**
 * CSV formula-injection guard. Spreadsheet apps (Excel, Sheets, Numbers) run a
 * cell starting with = + - @ (or a tab/CR) as a formula, so participant-typed
 * text like `=HYPERLINK(...)` would execute when a researcher opens an export.
 * Prefixing an apostrophe makes the cell open as plain text.
 *
 * Plain numbers (including negative ones such as "-5") are left untouched so
 * numeric columns stay numeric.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

export function neutralizeCsvFormula(value: string): string {
  if (!FORMULA_TRIGGER.test(value) || PLAIN_NUMBER.test(value)) return value
  return `'${value}`
}
