import { describe, expect, it, vi } from 'vitest'
import { getMetaPixelScript } from './meta-pixel-script'

describe('getMetaPixelScript', () => {
  it('initializes Meta Pixel and drains queued events without leaking the IIFE scope', () => {
    const insertBefore = vi.fn()
    const fakeDocument = {
      createElement: vi.fn(() => ({})),
      getElementsByTagName: vi.fn(() => [{ parentNode: { insertBefore } }]),
    }
    const fakeWindow = {
      location: { pathname: '/s/example', search: '?preview=true' },
      __veritioMetaQueue: [['trackCustom', 'QueuedEvent']],
    }

    const execute = new Function(
      'window',
      'document',
      'URLSearchParams',
      getMetaPixelScript('test-pixel-id')
    )

    expect(() => execute(fakeWindow, fakeDocument, URLSearchParams)).not.toThrow()

    const fbq = (fakeWindow as typeof fakeWindow & {
      fbq: { queue: ArrayLike<unknown>[] }
    }).fbq

    expect(insertBefore).toHaveBeenCalledOnce()
    expect(fbq.queue.map(args => Array.from(args))).toEqual([
      ['init', 'test-pixel-id'],
      ['track', 'PageView'],
      ['trackCustom', 'QueuedEvent'],
    ])
    expect(fakeWindow.__veritioMetaQueue).toEqual([])
  })
})
