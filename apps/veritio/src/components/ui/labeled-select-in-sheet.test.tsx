/**
 * LabeledSelect inside a Sheet.
 *
 * The admin plan editor is the first place in the app to put a Radix Select
 * inside a Radix Sheet, and the first place to use LabeledSelect at all. Both
 * are portal-based and focus-trapping, which is the combination that tends to
 * break. This pins the pairing down: the trigger renders with the current
 * value, opening it lists the options, and choosing one reports back.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LabeledSelect } from './labeled-select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet'

const OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'edu_classroom', label: 'Education — Classroom' },
  { value: 'edu_campus', label: 'Education — Campus' },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  // Radix Select probes pointer-capture APIs jsdom does not implement.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function renderInSheet(onValueChange = vi.fn(), value = 'starter') {
  act(() => {
    root.render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Organization Details</SheetTitle>
          </SheetHeader>
          <LabeledSelect
            label="Plan"
            value={value}
            onValueChange={onValueChange}
            options={OPTIONS}
          />
        </SheetContent>
      </Sheet>,
    )
  })
  return onValueChange
}

describe('LabeledSelect inside a Sheet', () => {
  it('renders the label and the currently selected option', () => {
    renderInSheet()

    expect(document.body.textContent).toContain('Plan')
    const trigger = document.body.querySelector('[role="combobox"]')
    expect(trigger).not.toBeNull()
    expect(trigger?.textContent).toContain('Starter')
  })

  it('shows an education tier as the selected value', () => {
    renderInSheet(vi.fn(), 'edu_classroom')

    const trigger = document.body.querySelector('[role="combobox"]')
    expect(trigger?.textContent).toContain('Education — Classroom')
  })

  it('opens inside the sheet without the sheet swallowing the interaction', () => {
    renderInSheet()

    const trigger = document.body.querySelector('[role="combobox"]') as HTMLElement
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    // Options render in a portal outside the sheet's DOM subtree.
    const options = Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (o) => o.textContent,
    )
    expect(options).toContain('Education — Campus')
  })

  it('reports the chosen value back to the caller', () => {
    const onValueChange = renderInSheet()

    const trigger = document.body.querySelector('[role="combobox"]') as HTMLElement
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    const campus = Array.from(document.body.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent?.includes('Education — Campus'),
    ) as HTMLElement
    expect(campus).toBeDefined()

    act(() => {
      campus.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(onValueChange).toHaveBeenCalledWith('edu_campus')
  })
})
