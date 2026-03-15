import type { Meta, StoryObj } from '@storybook/react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'
import { Button } from './button'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Collapsible> = {
  title: 'UI/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Collapsible>

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-96">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="p-0">
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            <span className="ml-2">Click to expand</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <p>Collapsible content appears here</p>
        </CollapsibleContent>
      </Collapsible>
    )
  },
}
