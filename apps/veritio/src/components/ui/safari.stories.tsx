import type { Meta, StoryObj } from '@storybook/react'
import { Safari } from './safari'

const meta: Meta<typeof Safari> = {
  title: 'UI/Safari',
  component: Safari,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Safari>

export const Default: Story = {
  args: {
    url: 'https://example.com',
  },
  render: (args) => <Safari {...args} className="w-full" />
}
