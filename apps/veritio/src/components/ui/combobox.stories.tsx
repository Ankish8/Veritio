import type { Meta, StoryObj } from '@storybook/react'
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from './combobox'

const meta: Meta<typeof Combobox> = {
  title: 'UI/Combobox',
  component: Combobox,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Combobox>

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <Combobox value="" onValueChange={() => {}}>
        <ComboboxInput placeholder="Select or type..." />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="apple">Apple</ComboboxItem>
            <ComboboxItem value="banana">Banana</ComboboxItem>
            <ComboboxItem value="orange">Orange</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
}
