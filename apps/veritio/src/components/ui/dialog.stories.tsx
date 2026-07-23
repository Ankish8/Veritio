import type { Meta, StoryObj } from '@storybook/react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './dialog'
import { Button } from './button'
import { useState } from 'react'

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof Dialog>

const TALL_CONTENT_ROWS = Array.from({ length: 40 }, (_, index) => index + 1)

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>This is a dialog description.</DialogDescription>
          </DialogHeader>
          <p className="py-4">Dialog content goes here</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
}

export const TallContent: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Open Tall Dialog</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Tall Dialog</DialogTitle>
            <DialogDescription>
              Verifies viewport containment and internal scrolling.
            </DialogDescription>
          </DialogHeader>
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-xs">
              this-is-an-intentionally-long-unbroken-value-that-must-wrap-inside-the-dialog-without-growing-the-page
            </p>
            {TALL_CONTENT_ROWS.map((row) => (
              <p key={row}>Scrollable content row {row}</p>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
}
