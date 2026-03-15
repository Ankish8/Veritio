/**
 * Centralized D3 lazy loader singleton.
 * Reduces initial bundle size by ~200KB by deferring the D3 import
 * until a visualization component actually needs it.
 */

export type D3Module = typeof import('d3')

let d3Promise: Promise<D3Module> | null = null

export function loadD3(): Promise<D3Module> {
  if (!d3Promise) {
    d3Promise = import('d3')
  }
  return d3Promise
}
