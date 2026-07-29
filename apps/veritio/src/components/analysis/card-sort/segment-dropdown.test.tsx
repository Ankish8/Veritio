import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardSortSegmentDropdown } from './segment-dropdown'

interface RenderResult {
  container: HTMLDivElement
  root: Root
}

function renderDropdowns(
  count: number,
  overrides: Partial<ComponentProps<typeof CardSortSegmentDropdown>> = {}
): RenderResult {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props: ComponentProps<typeof CardSortSegmentDropdown> = {
    activeSegmentId: null,
    segments: [{ id: 'segment-1', name: 'Power users' }],
    onApplySegment: vi.fn(),
    onClearSegment: vi.fn(),
    onCreateSegment: vi.fn(),
    onViewAllSegments: vi.fn(),
    ...overrides,
  }

  act(() => {
    root.render(
      <>
        {Array.from({ length: count }, (_, index) => (
          <CardSortSegmentDropdown key={index} {...props} />
        ))}
      </>
    )
  })

  return { container, root }
}

function openDropdown(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
    }))
  })
}

function clickMenuItem(label: string) {
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    .find((element) => element.textContent?.includes(label))

  if (!item) {
    throw new Error(`Expected menu item "${label}"`)
  }

  act(() => {
    item.click()
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CardSortSegmentDropdown', () => {
  it('opens only the clicked instance when multiple analysis panels are mounted', () => {
    const { container, root } = renderDropdowns(2)
    const triggers = container.querySelectorAll<HTMLButtonElement>(
      '[data-slot="dropdown-menu-trigger"]'
    )

    expect(triggers).toHaveLength(2)
    openDropdown(triggers[0])

    expect(triggers[0].getAttribute('aria-expanded')).toBe('true')
    expect(triggers[1].getAttribute('aria-expanded')).toBe('false')
    expect(
      document.querySelectorAll(
        '[data-slot="dropdown-menu-content"][data-state="open"]'
      )
    ).toHaveLength(1)

    act(() => root.unmount())
  })

  it('preserves segment selection and navigation actions', () => {
    const onApplySegment = vi.fn()
    const onClearSegment = vi.fn()
    const onCreateSegment = vi.fn()
    const onViewAllSegments = vi.fn()
    const { container, root } = renderDropdowns(1, {
      onApplySegment,
      onClearSegment,
      onCreateSegment,
      onViewAllSegments,
    })
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="dropdown-menu-trigger"]'
    )

    if (!trigger) {
      throw new Error('Expected segment dropdown trigger')
    }

    openDropdown(trigger)
    clickMenuItem('Power users')
    expect(onApplySegment).toHaveBeenCalledWith('segment-1')

    openDropdown(trigger)
    clickMenuItem('All included participants')
    expect(onClearSegment).toHaveBeenCalledOnce()

    openDropdown(trigger)
    clickMenuItem('Create segment')
    expect(onCreateSegment).toHaveBeenCalledOnce()

    openDropdown(trigger)
    clickMenuItem('View all segments')
    expect(onViewAllSegments).toHaveBeenCalledOnce()

    act(() => root.unmount())
  })
})
