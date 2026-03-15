import type { Meta, StoryObj } from '@storybook/react'
import { TypeToDeleteDialog } from './type-to-delete-dialog'
import { Button } from './button'
import { useState } from 'react'

const meta: Meta<typeof TypeToDeleteDialog> = {
  title: 'UI/TypeToDeleteDialog',
  component: TypeToDeleteDialog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof TypeToDeleteDialog>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <TypeToDeleteDialog
          open={open}
          onOpenChange={setOpen}
          itemName="Project"
          itemType="project"
          onConfirm={() => setOpen(false)}
        />
        <Button onClick={() => setOpen(true)} variant="destructive">Delete Project</Button>
      </>
    )
  },
}
