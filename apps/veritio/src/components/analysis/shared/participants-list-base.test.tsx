import {
  act,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@veritio/ui/components/sonner', () => ({ toast }))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 52,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: 52,
        start: index * 52,
      })),
  }),
}))

vi.mock('@veritio/ui/components/button', () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    asChild: _asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string
    size?: string
    asChild?: boolean
  }) => <button {...props}>{children}</button>,
}))

vi.mock('@veritio/ui/components/checkbox', () => ({
  Checkbox: ({
    onCheckedChange,
    ...props
  }: InputHTMLAttributes<HTMLInputElement> & {
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <input
      type="checkbox"
      {...props}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
    />
  ),
}))

vi.mock('@veritio/ui/components/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}))

vi.mock('@veritio/ui/components/alert-dialog', () => {
  const Wrapper = ({ children }: { children: ReactNode }) => <div>{children}</div>

  return {
    AlertDialog: ({
      open,
      children,
    }: {
      open?: boolean
      children: ReactNode
    }) => (open ? <>{children}</> : null),
    AlertDialogAction: ({
      children,
      variant: _variant,
      showKeyboardHint: _showKeyboardHint,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: string
      showKeyboardHint?: boolean
    }) => <button {...props}>{children}</button>,
    AlertDialogCancel: ({
      children,
      showKeyboardHint: _showKeyboardHint,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      showKeyboardHint?: boolean
    }) => <button {...props}>{children}</button>,
    AlertDialogContent: Wrapper,
    AlertDialogDescription: Wrapper,
    AlertDialogFooter: Wrapper,
    AlertDialogHeader: Wrapper,
    AlertDialogTitle: Wrapper,
  }
})

import {
  ParticipantsListBase,
  type RowHandlers,
} from '@veritio/analysis-shared'

interface TestParticipant {
  id: string
  name: string
}

const participant = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Participant one',
}

describe('ParticipantsListBase permanent deletion', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  async function renderList(
    onDeleteParticipants: (participantIds: string[]) => Promise<number>,
  ) {
    await act(async () => {
      root.render(
        <ParticipantsListBase<TestParticipant>
          items={[participant]}
          getParticipantId={(item) => item.id}
          isExcluded={() => false}
          onDeleteParticipants={onDeleteParticipants}
          renderColumns={() => <div>Participant</div>}
          renderRow={(
            item: TestParticipant,
            _index: number,
            handlers: RowHandlers,
          ) => (
            <div>
              <button
                type="button"
                data-testid={`select-${item.id}`}
                onClick={handlers.onToggleSelect}
              >
                Select {item.name}
              </button>
            </div>
          )}
          renderDetailDialog={() => null}
        />,
      )
    })
  }

  function buttonWithText(text: string) {
    return [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === text,
    )
  }

  async function selectAndConfirmDelete() {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(`[data-testid="select-${participant.id}"]`)
        ?.click()
    })

    expect(container.textContent).toContain('1 selected')

    await act(async () => {
      buttonWithText('Delete')?.click()
    })

    expect(container.textContent).toContain(
      'Delete 1 participant permanently?',
    )
    expect(container.textContent).toContain(
      'Reusable Panel profiles will remain.',
    )

    await act(async () => {
      buttonWithText('Delete 1')?.click()
      await Promise.resolve()
    })
  }

  it('clears the selection only after confirmed deletion succeeds', async () => {
    const onDeleteParticipants = vi.fn().mockResolvedValue(1)
    await renderList(onDeleteParticipants)

    await selectAndConfirmDelete()

    expect(onDeleteParticipants).toHaveBeenCalledWith([participant.id])
    expect(container.textContent).not.toContain('1 selected')
    expect(toast.success).toHaveBeenCalledWith(
      '1 participant deleted permanently',
    )
  })

  it('preserves the selection when deletion fails so it can be retried', async () => {
    const onDeleteParticipants = vi
      .fn()
      .mockRejectedValue(new Error('R2 unavailable'))
    await renderList(onDeleteParticipants)

    await selectAndConfirmDelete()

    expect(container.textContent).toContain('1 selected')
    expect(toast.error).toHaveBeenCalledWith(
      'Participants could not be deleted',
      { description: 'R2 unavailable' },
    )
  })
})
