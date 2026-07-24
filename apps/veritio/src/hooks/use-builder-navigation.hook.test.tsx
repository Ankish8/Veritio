import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const navigationState = vi.hoisted(() => ({
  pathname: '/projects/project-1/studies/study-1/builder',
  searchParams: new URLSearchParams('source=dashboard'),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}))

import { useBuilderNavigation } from './use-builder-navigation'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('useBuilderNavigation', () => {
  it('switches tabs through native history without fetching an RSC payload', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const fetchSpy = vi.spyOn(window, 'fetch')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    function Harness() {
      const { setTab } = useBuilderNavigation()
      return <button onClick={() => setTab('settings')}>Settings</button>
    }

    await act(async () => {
      root.render(<Harness />)
    })

    await act(async () => {
      container.querySelector('button')?.click()
    })

    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      `${navigationState.pathname}?source=dashboard&tab=settings`,
    )
    expect(fetchSpy).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
  })
})
