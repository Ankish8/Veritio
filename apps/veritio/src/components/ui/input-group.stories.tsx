import type { Meta, StoryObj } from '@storybook/react'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from './input-group'
import { Search, DollarSign } from 'lucide-react'

const meta: Meta<typeof InputGroup> = {
  title: 'UI/InputGroup',
  component: InputGroup,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof InputGroup>

export const WithPrefix: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupAddon align="inline-start">
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),
}

export const WithCurrency: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupAddon align="inline-start">
        <InputGroupText>
          <DollarSign className="h-4 w-4" />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="0.00" type="number" />
    </InputGroup>
  ),
}
