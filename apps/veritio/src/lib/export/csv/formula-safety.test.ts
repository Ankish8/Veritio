import { describe, expect, it } from 'vitest'
import { neutralizeCsvFormula } from './formula-safety'
import { formatCSV } from './formatters'

describe('neutralizeCsvFormula', () => {
  it.each(['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\t=x', '=HYPERLINK("http://evil")'])('prefixes %j', (value) => {
    expect(neutralizeCsvFormula(value)).toBe(`'${value}`)
  })

  it.each(['-5', '+3', '-0.25', '1e5', 'hello', '', 'a=b'])('leaves %j alone', (value) => {
    expect(neutralizeCsvFormula(value)).toBe(value)
  })
})

describe('formatCSV formula safety', () => {
  it('neutralizes string cells but leaves numbers', () => {
    expect(formatCSV([['=cmd', -5, '-5', 'ok']])).toBe(`'=cmd,-5,-5,ok`)
  })
})
