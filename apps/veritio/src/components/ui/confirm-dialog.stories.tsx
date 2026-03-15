import type { Meta, StoryObj } from '@storybook/react'
import { ConfirmDialog } from './confirm-dialog'
import { Button } from './button'
import { useState } from 'react'

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ConfirmDialog>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Are you sure?"
          description="This action cannot be undone."
          variant="info"
          onConfirm={() => setOpen(false)}
        />
      </>
    )
  },
}
