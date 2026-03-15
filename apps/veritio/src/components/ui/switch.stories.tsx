import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './switch'
import { Label } from './label'
import { useState } from 'react'

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'sm'],
      description: 'Switch size',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the switch is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the switch',
    },
  },
}

export default meta
type Story = StoryObj<typeof Switch>

export const Default: Story = {
  args: {
    size: 'default',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
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
        <Switch id="airplane-mode" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="airplane-mode">Airplane Mode</Label>
      </div>
    )
  },
}

export const Checked: Story = {
  args: {
    checked: true,
  },
}
