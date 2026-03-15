import type { Meta, StoryObj } from '@storybook/react'
import { DeleteConfirmationDialog } from './delete-confirmation-dialog'
import { Button } from './button'
import { useState } from 'react'

const meta: Meta<typeof DeleteConfirmationDialog> = {
  title: 'UI/DeleteConfirmationDialog',
  component: DeleteConfirmationDialog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DeleteConfirmationDialog>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <DeleteConfirmationDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete item?"
          description="This cannot be undone."
          onConfirm={() => setOpen(false)}
        />
        <Button onClick={() => setOpen(true)} variant="destructive">Delete</Button>
      </>
    )
  },
}
