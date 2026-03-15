import type { Meta, StoryObj } from '@storybook/react'
import { ScrollArea } from './scroll-area'

const meta: Meta<typeof ScrollArea> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof ScrollArea>

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="w-96 h-72 border rounded-md p-4">
      <div className="space-y-2">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="text-sm">Item {i + 1}</div>
        ))}
      </div>
    </ScrollArea>
  ),
}
