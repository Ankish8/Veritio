import type { Meta, StoryObj } from '@storybook/react'
import { Toaster, toast } from './sonner'
import { Button } from './button'

const meta: Meta<typeof Toaster> = {
  title: 'UI/Sonner',
  component: Toaster,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Toaster>

export const Default: Story = {
  render: () => (
    <>
      <Toaster />
      <div className="space-y-2">
        <Button onClick={() => toast.success('Success!')}>Show Success</Button>
        <Button onClick={() => toast.error('Error!')}>Show Error</Button>
        <Button onClick={() => toast.loading('Loading...')}>Show Loading</Button>
      </div>
    </>
  ),
}
