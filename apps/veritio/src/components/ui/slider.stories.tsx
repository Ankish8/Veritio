import type { Meta, StoryObj } from '@storybook/react'
import { Slider } from './slider'
import { useState } from 'react'

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    min: {
      control: { type: 'range', min: 0, max: 100 },
      description: 'Minimum value',
    },
    max: {
      control: { type: 'range', min: 0, max: 100 },
      description: 'Maximum value',
    },
    step: {
      control: { type: 'range', min: 1, max: 10 },
      description: 'Step increment',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the slider',
    },
  },
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState([50])
    return (
      <div className="w-96">
        <Slider value={value} onValueChange={setValue} min={0} max={100} step={1} />
        <p className="text-center text-sm mt-2">Value: {value[0]}</p>
      </div>
    )
  },
}

export const Range: Story = {
  render: () => {
    const [value, setValue] = useState([20, 80])
    return (
      <div className="w-96">
        <Slider value={value} onValueChange={setValue} min={0} max={100} step={1} />
        <p className="text-center text-sm mt-2">Range: {value[0]} - {value[1]}</p>
      </div>
    )
  },
}

export const WithStep: Story = {
  render: () => {
    const [value, setValue] = useState([50])
    return (
      <div className="w-96">
        <Slider value={value} onValueChange={setValue} min={0} max={100} step={10} />
        <p className="text-center text-sm mt-2">Value: {value[0]} (step: 10)</p>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="w-96">
      <Slider value={[50]} disabled min={0} max={100} />
    </div>
  ),
}
