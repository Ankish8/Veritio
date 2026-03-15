import type { Meta, StoryObj } from '@storybook/react'
import { LazyBarChart } from './lazy-charts'

const meta: Meta<typeof LazyBarChart> = {
  title: 'UI/LazyCharts',
  component: LazyBarChart,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof LazyBarChart>

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 200 },
  { name: 'Apr', value: 278 },
]

export const BarChart: Story = {
  render: () => (
    <div className="w-96 h-64">
      <LazyBarChart data={data} />
    </div>
  ),
}
