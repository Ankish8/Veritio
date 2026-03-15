import type { Meta, StoryObj } from '@storybook/react'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './command'

const meta: Meta<typeof Command> = {
  title: 'UI/Command',
  component: Command,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Command>

export const Default: Story = {
  render: () => (
    <Command>
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Create</CommandItem>
          <CommandItem>Edit</CommandItem>
          <CommandItem>Delete</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
