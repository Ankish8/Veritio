import type { Meta, StoryObj } from '@storybook/react'
import { KeyboardShortcutHint, EscapeHint } from './keyboard-shortcut-hint'
import { Button } from './button'

const meta: Meta<typeof KeyboardShortcutHint> = {
  title: 'UI/KeyboardShortcutHint',
  component: KeyboardShortcutHint,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof KeyboardShortcutHint>

export const Default: Story = {
  render: () => (
    <div className="space-y-4">
      <Button>
        Save
        <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
      </Button>
    </div>
  ),
}

export const EscapeHintStory: Story = {
  render: () => (
    <Button>
      Close
      <EscapeHint />
    </Button>
  ),
}
