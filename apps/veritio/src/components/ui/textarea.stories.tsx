import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './textarea'
import { Label } from './label'

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the textarea',
    },
    rows: {
      control: { type: 'range', min: 2, max: 10 },
      description: 'Number of rows',
    },
  },
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
  render: (args) => <Textarea {...args} className="w-96" />,
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-96 space-y-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Enter your message..." />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'This textarea is disabled',
  },
  render: (args) => <Textarea {...args} className="w-96" />,
}

export const LargeContent: Story = {
  render: () => (
    <Textarea
      defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
      className="w-96"
    />
  ),
}
