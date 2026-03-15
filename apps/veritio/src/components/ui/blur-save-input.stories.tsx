import type { Meta, StoryObj } from '@storybook/react'
import { BlurSaveInput } from './blur-save-input'
import { useState } from 'react'

const meta: Meta<typeof BlurSaveInput> = {
  title: 'UI/BlurSaveInput',
  component: BlurSaveInput,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BlurSaveInput>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('Initial value')
    return <BlurSaveInput value={value} onValueChange={setValue} placeholder="Edit me..." className="w-96" />
  },
}
