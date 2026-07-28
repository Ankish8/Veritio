import { describe, expect, it } from 'vitest'
import { STYLE_PRESETS } from './style-presets'

type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function composite(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  return foreground.map((value, index) =>
    Math.round(value * alpha + background[index] * (1 - alpha)),
  ) as Rgb
}

function luminance(color: Rgb): number {
  const channels = color.map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const lighter = Math.max(luminance(first), luminance(second))
  const darker = Math.min(luminance(first), luminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('glass content-surface contrast', () => {
  it('keeps normal participant text at WCAG AA against black and white image extremes', () => {
    for (const preset of Object.values(STYLE_PRESETS)) {
      const variants = [
        {
          surface: parseHex(preset.cssVariables['--style-card-bg']),
          text: parseHex(preset.cssVariables['--style-text-primary']),
        },
        {
          surface: parseHex(preset.darkVariables['--style-card-bg']),
          text: parseHex(preset.darkVariables['--style-text-primary']),
        },
      ]

      for (const variant of variants) {
        for (const imageExtreme of [[0, 0, 0], [255, 255, 255]] as Rgb[]) {
          const glass = composite(variant.surface, imageExtreme, 0.88)
          expect(contrastRatio(variant.text, glass)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})
