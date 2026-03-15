import type { Meta, StoryObj } from '@storybook/react'
import { Label } from './label'

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    htmlFor: {
      control: 'text',
      description: 'Associated input id',
    },
    children: {
      control: 'text',
      description: 'Label text',
    },
  },
}

export default meta
type Story = StoryObj<typeof Label>

export const Default: Story = {
  args: {
    children: 'Label',
  },
}

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <input
        id="email"
        type="email"
        placeholder="Enter your email"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
    </div>
  ),
}

export const Required: Story = {
  render: () => (
    <Label>
      Name <span className="text-red-500">*</span>
    </Label>
  ),
}
