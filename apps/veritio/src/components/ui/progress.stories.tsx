import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from './progress'

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Progress value (0-100)',
    },
    branded: {
      control: 'boolean',
      description: 'Use brand color styling',
    },
  },
}

export default meta
type Story = StoryObj<typeof Progress>

export const Default: Story = {
  args: {
    value: 50,
    branded: false,
  },
  render: (args) => <Progress {...args} className="w-96" />,
}

export const Empty: Story = {
  args: {
    value: 0,
  },
  render: (args) => <Progress {...args} className="w-96" />,
}

export const Full: Story = {
  args: {
    value: 100,
  },
  render: (args) => <Progress {...args} className="w-96" />,
}

export const Branded: Story = {
  args: {
    value: 75,
    branded: true,
  },
  render: (args) => <Progress {...args} className="w-96" />,
}

export const States: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">0%</p>
        <Progress value={0} className="w-full" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">25%</p>
        <Progress value={25} className="w-full" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">50%</p>
        <Progress value={50} className="w-full" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">75%</p>
        <Progress value={75} className="w-full" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">100%</p>
        <Progress value={100} className="w-full" />
      </div>
    </div>
  ),
}
