import type { Meta, StoryObj } from '@storybook/react'
import { SegmentedControl } from './segmented-control'

const meta: Meta<typeof SegmentedControl> = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SegmentedControl>

const options = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export const Default: Story = {
  args: {
    options,
    value: 'day',
  },
  render: (args) => <SegmentedControl {...args} onValueChange={() => {}} />,
}
