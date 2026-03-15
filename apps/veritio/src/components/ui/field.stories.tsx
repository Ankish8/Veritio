import type { Meta, StoryObj } from '@storybook/react'
import { Field, FieldLabel, FieldContent, FieldError, FieldDescription } from './field'
import { Input } from './input'

const meta: Meta<typeof Field> = {
  title: 'UI/Field',
  component: Field,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Field>

export const Default: Story = {
  render: () => (
    <Field className="w-96">
      <FieldLabel>Email Address</FieldLabel>
      <FieldContent>
        <Input placeholder="your@email.com" />
      </FieldContent>
      <FieldDescription>We'll never share your email</FieldDescription>
    </Field>
  ),
}

export const WithError: Story = {
  render: () => (
    <Field className="w-96">
      <FieldLabel>Email Address</FieldLabel>
      <FieldContent>
        <Input placeholder="your@email.com" className="border-red-500" />
      </FieldContent>
      <FieldError>Invalid email address</FieldError>
    </Field>
  ),
}
