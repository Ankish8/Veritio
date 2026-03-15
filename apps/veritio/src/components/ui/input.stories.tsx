import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'
import { Label } from './label'
import { Field, FieldError } from './field'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
  render: (args) => <Input {...args} className="w-96" />,
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'your@email.com',
  },
  render: (args) => <Input {...args} className="w-96" />,
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
  render: (args) => <Input {...args} className="w-96" />,
}

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
  render: (args) => <Input {...args} className="w-96" />,
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-96 space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="your@email.com" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled',
  },
  render: (args) => <Input {...args} className="w-96" />,
}

export const WithError: Story = {
  render: () => (
    <Field className="w-96">
      <Label>Email</Label>
      <Input type="email" placeholder="your@email.com" className="border-red-500" />
      <FieldError>Please enter a valid email address</FieldError>
    </Field>
  ),
}
