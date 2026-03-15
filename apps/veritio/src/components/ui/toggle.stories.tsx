import type { Meta, StoryObj } from '@storybook/react'
import { Toggle } from './toggle'
import { Bold, Italic, Underline } from 'lucide-react'

const meta: Meta<typeof Toggle> = {
  title: 'UI/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
      description: 'Toggle variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
      description: 'Toggle size',
    },
    pressed: {
      control: 'boolean',
      description: 'Whether the toggle is pressed',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the toggle',
    },
  },
}

export default meta
type Story = StoryObj<typeof Toggle>

export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Toggle',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
}

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-2">
      <Toggle>
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle>
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle>
        <Underline className="h-4 w-4" />
      </Toggle>
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}
