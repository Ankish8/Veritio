import type { Meta, StoryObj } from '@storybook/react'
import { Separator } from './separator'

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Separator orientation',
    },
    decorative: {
      control: 'boolean',
      description: 'Decorative separator (no accessibility role)',
    },
  },
}

export default meta
type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
  render: () => (
    <div className="w-full space-y-4">
      <p>Content before separator</p>
      <Separator orientation="horizontal" />
      <p>Content after separator</p>
    </div>
  ),
}

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: () => (
    <div className="flex h-20 gap-4">
      <p>Left</p>
      <Separator orientation="vertical" />
      <p>Right</p>
    </div>
  ),
}
