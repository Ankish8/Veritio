import type { Meta, StoryObj } from '@storybook/react'
import { RealtimeStatus } from './realtime-status'

const meta: Meta<typeof RealtimeStatus> = {
  title: 'UI/RealtimeStatus',
  component: RealtimeStatus,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof RealtimeStatus>

export const Connected: Story = {
  args: {
    isConnected: true,
  },
}

export const Disconnected: Story = {
  args: {
    isConnected: false,
  },
}
