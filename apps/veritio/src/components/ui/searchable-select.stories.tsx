import type { Meta, StoryObj } from '@storybook/react'
import { SearchableSelect } from './searchable-select'
import { useState } from 'react'

const meta: Meta<typeof SearchableSelect> = {
  title: 'UI/SearchableSelect',
  component: SearchableSelect,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SearchableSelect>

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Orange', value: 'orange' },
  { label: 'Grapes', value: 'grapes' },
]

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <SearchableSelect
        value={value}
        onValueChange={setValue}
        options={options}
        placeholder="Select fruit..."
        searchPlaceholder="Search fruits..."
      />
    )
  },
}
