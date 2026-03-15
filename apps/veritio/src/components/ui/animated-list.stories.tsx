import type { Meta, StoryObj } from '@storybook/react'
import { AnimatedList, AnimatedListItem } from './animated-list'

const meta: Meta<typeof AnimatedList> = {
  title: 'UI/AnimatedList',
  component: AnimatedList,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AnimatedList>

export const Default: Story = {
  render: () => (
    <AnimatedList>
      {Array.from({ length: 5 }).map((_, i) => (
        <AnimatedListItem key={i} index={i}>
          <p>Item {i + 1}</p>
        </AnimatedListItem>
      ))}
    </AnimatedList>
  ),
}
