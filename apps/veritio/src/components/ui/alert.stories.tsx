import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertTitle, AlertDescription, AlertAction } from './alert'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from './button'

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
      description: 'Alert variant',
    },
  },
}

export default meta
type Story = StoryObj<typeof Alert>

export const Default: Story = {
  render: () => (
    <Alert>
      <CheckCircle className="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>Your action was completed successfully.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Something went wrong. Please try again.</AlertDescription>
    </Alert>
  ),
}

export const WithAction: Story = {
  render: () => (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components and dependencies to your app using the cli.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm">
          Learn more
        </Button>
      </AlertAction>
    </Alert>
  ),
}
