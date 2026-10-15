import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const keyState = vi.hoisted(() => ({ hasKey: false, isLoading: false }))
vi.mock('@/hooks/use-has-openai-key', () => ({ useHasOpenAiKey: () => keyState }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}))

import { TooltipProvider } from '@/components/ui/tooltip'
import { OpenAiKeyGate, OpenAiKeyRequiredNotice } from './openai-key-gate'

let root: Root | null = null
let container: HTMLDivElement | null = null

function render(node: React.ReactNode) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(<TooltipProvider>{node}</TooltipProvider>))
  return container
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

const gated = (
  <OpenAiKeyGate>{(disabled) => <button disabled={disabled}>Build with AI</button>}</OpenAiKeyGate>
)

describe('OpenAiKeyGate', () => {
  it('disables the control and explains why when the user has no OpenAI key', () => {
    Object.assign(keyState, { hasKey: false, isLoading: false })
    const el = render(gated)
    expect(el.querySelector('button')?.disabled).toBe(true)
    expect(el.querySelector('[aria-label]')?.getAttribute('aria-label')).toContain('Settings > AI Models')
  })

  it('leaves the control enabled when the user has a key', () => {
    Object.assign(keyState, { hasKey: true, isLoading: false })
    expect(render(gated).querySelector('button')?.disabled).toBe(false)
  })

  it('does not flash the disabled state while preferences load', () => {
    Object.assign(keyState, { hasKey: false, isLoading: true })
    expect(render(gated).querySelector('button')?.disabled).toBe(false)
  })
})

describe('OpenAiKeyRequiredNotice', () => {
  it('links to the AI Models settings tab', () => {
    const link = render(<OpenAiKeyRequiredNotice />).querySelector('a')
    expect(link?.getAttribute('href')).toBe('/settings?tab=ai-models')
  })
})
