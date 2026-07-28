import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeBackgroundImage } from './storage'

const originalImage = globalThis.Image
const originalCreateObjectUrl = URL.createObjectURL
const originalRevokeObjectUrl = URL.revokeObjectURL

afterEach(() => {
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: originalImage,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: originalCreateObjectUrl,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: originalRevokeObjectUrl,
  })
})

function installImageDecoder(result: 'load' | 'error') {
  class TestImage {
    naturalWidth = result === 'load' ? 1600 : 0
    naturalHeight = result === 'load' ? 900 : 0
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      queueMicrotask(() => {
        if (result === 'load') this.onload?.()
        else this.onerror?.()
      })
    }
  }

  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: TestImage,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:test-background'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
}

describe('background image browser decoding', () => {
  it('returns intrinsic dimensions for a readable image', async () => {
    installImageDecoder('load')
    const file = new File(['valid'], 'background.webp', { type: 'image/webp' })

    await expect(decodeBackgroundImage(file)).resolves.toEqual({
      width: 1600,
      height: 900,
    })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-background')
  })

  it('rejects corrupt images before they are uploaded or attached', async () => {
    installImageDecoder('error')
    const file = new File(['corrupt'], 'background.png', { type: 'image/png' })

    await expect(decodeBackgroundImage(file)).rejects.toThrow(
      'could not be decoded',
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-background')
  })
})
