import type { Meta, StoryObj } from '@storybook/react'
import { Tabs } from './tabs'
import { ScrollableTabsList } from './scrollable-tabs'

const meta: Meta<typeof ScrollableTabsList> = {
  title: 'UI/ScrollableTabs',
  component: ScrollableTabsList,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ScrollableTabsList>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1">
      <ScrollableTabsList>
        {Array.from({ length: 15 }).map((_, i) => (
          <button key={i} value={`tab${i}`} className="px-3 py-1 text-sm">Tab {i + 1}</button>
        ))}
      </ScrollableTabsList>
    </Tabs>
  ),
}
