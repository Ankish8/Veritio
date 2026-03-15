import type { Meta, StoryObj } from '@storybook/react'
import { BrowserFrame } from './browser-frame'

const meta: Meta<typeof BrowserFrame> = {
  title: 'UI/BrowserFrame',
  component: BrowserFrame,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BrowserFrame>

export const Default: Story = {
  args: {
    url: 'https://example.com',
  },
  render: (args) => <BrowserFrame {...args} className="w-full" />
}
