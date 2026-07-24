import { act, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const yjsState = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))

vi.mock('./context', () => ({
  useYjsOptional: () => yjsState.current,
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}))

import { SyncStatusIndicator } from './sync-status-indicator'

function createYjsState(overrides: Record<string, unknown> = {}) {
  return {
    provider: null,
    status: 'connecting',
    isConnected: false,
    isSynced: false,
    error: null,
    isUnhealthy: false,
    users: [],
    reconnect: vi.fn(),
    ...overrides,
  }
}

describe('SyncStatusIndicator', () => {
  let container: HTMLDivElement
  let root: Root
  let renderVersion: number

  beforeEach(() => {
    vi.useFakeTimers()
    renderVersion = 0
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    yjsState.current = null
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  async function renderIndicator() {
    await act(async () => {
      root.render(
        <SyncStatusIndicator
          size="sm"
          showUserCount={false}
          transientDelayMs={4_000}
          className={`test-render-${renderVersion++}`}
        />
      )
    })
  }

  it('keeps brief connection and sync transitions out of the header', async () => {
    yjsState.current = createYjsState()
    await renderIndicator()

    expect(container.textContent).toBe('')

    await act(async () => {
      vi.advanceTimersByTime(3_999)
    })
    expect(container.textContent).toBe('')

    yjsState.current = createYjsState({
      status: 'connected',
      isConnected: true,
      isSynced: true,
    })
    await renderIndicator()

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(container.textContent).toBe('')
  })

  it('reveals a connection state when background work persists', async () => {
    yjsState.current = createYjsState()
    await renderIndicator()

    await act(async () => {
      vi.advanceTimersByTime(4_000)
    })

    expect(container.textContent).toContain('Collab reconnecting')
  })

  it('shows actionable collaboration failures immediately and retries on click', async () => {
    const reconnect = vi.fn()
    yjsState.current = createYjsState({
      status: 'disconnected',
      error:
        'Real-time collaboration is reconnecting. Changes continue to save normally.',
      isUnhealthy: true,
      reconnect,
    })
    await renderIndicator()

    expect(container.textContent).toContain('Collab offline')
    const retryButton = container.querySelector('button')
    expect(retryButton).not.toBeNull()

    await act(async () => {
      retryButton?.click()
    })
    expect(reconnect).toHaveBeenCalledOnce()
  })
})
