import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './checkbox'
import { Label } from './label'
import { useState } from 'react'

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    branded: {
      control: 'boolean',
      description: 'Use brand color',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the checkbox',
    },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  args: {
    branded: false,
  },
}

export const Branded: Story = {
  args: {
    branded: true,
  },
}

export const Checked: Story = {
  args: {
    checked: true,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

export const WithLabel: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
        <Label htmlFor="terms">I agree to the terms and conditions</Label>
      </div>
    )
  },
}

export const BrandedVariant: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="branded" branded={true} defaultChecked={true} />
      <Label htmlFor="branded">Branded checkbox</Label>
    </div>
  ),
}
