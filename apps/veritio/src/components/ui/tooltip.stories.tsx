import type { Meta, StoryObj } from '@storybook/react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'
import { Button } from './button'
import { Plus } from 'lucide-react'

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This is a tooltip</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add new item</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const Positions: Story = {
  render: () => (
    <div className="space-y-8">
      <TooltipProvider>
        <div className="space-y-4">
          <p className="text-sm font-medium">Top</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">Hover</Button>
            </TooltipTrigger>
            <TooltipContent side="top">Top tooltip</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  ),
}
