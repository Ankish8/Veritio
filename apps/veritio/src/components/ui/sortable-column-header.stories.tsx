import type { Meta, StoryObj } from '@storybook/react'
import { SortableColumnHeader } from './sortable-column-header'

const meta: Meta<typeof SortableColumnHeader> = {
  title: 'UI/SortableColumnHeader',
  component: SortableColumnHeader,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SortableColumnHeader>

export const Default: Story = {
  args: {
    children: 'Name',
  },
  render: (args) => <SortableColumnHeader {...args} onClick={() => {}} />,
}

export const Ascending: Story = {
  args: {
    children: 'Name',
    direction: 'asc',
    isActive: true,
  },
  render: (args) => <SortableColumnHeader {...args} onClick={() => {}} />,
}
