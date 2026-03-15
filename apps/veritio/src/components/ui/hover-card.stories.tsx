import type { Meta, StoryObj } from '@storybook/react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'
import { Button } from './button'
import React from 'react'

const meta: Meta<typeof HoverCard> = {
  title: 'UI/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof HoverCard>

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">@username</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-2">
          <h4 className="font-semibold">John Doe</h4>
          <p className="text-sm">Software developer</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}
