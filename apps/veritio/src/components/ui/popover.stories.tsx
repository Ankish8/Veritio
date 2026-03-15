import type { Meta, StoryObj } from '@storybook/react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Button } from './button'

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Popover>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Click me</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Popover Title</h4>
          <p className="text-sm">Popover content goes here</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
}
