import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Slider } from "./slider"

const meta = {
  title: "Forms & inputs/Slider",
  id: "atoms-slider",
  component: Slider,
  tags: ["autodocs"],
  decorators: [(S) => <div className="w-80"><S /></div>],
  parameters: { docs: { description: { component: "the reference slider on Radix: label + output, range (two thumbs), steps, marks, vertical, disabled." } } },
} satisfies Meta<typeof Slider>
export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = { args: { defaultValue: [40], label: "Quantity", output: true, max: 10, step: 1 } }
export const Range: Story = { args: { defaultValue: [20, 80], label: "Price range", output: (v: number[]) => `€${v[0]} – €${v[1]}` } }
export const WithSteps: Story = { args: { defaultValue: [3], min: 0, max: 10, step: 1, label: "Tickets", output: true, showSteps: true } }
export const WithMarks: Story = {
  args: {
    defaultValue: [50], label: "Distance", output: (v: number[]) => `${v[0]} km`, step: 25,
    marks: [{ value: 0, label: "0" }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100, label: "100 km" }],
  },
}
export const Disabled: Story = { args: { defaultValue: [60], label: "Volume", output: true, disabled: true } }
export const Vertical: Story = {
  decorators: [(S) => <div className="h-64"><S /></div>],
  args: { orientation: "vertical", defaultValue: [50], label: "Level", output: true },
}
export const Controlled: Story = {
  render: function Render() {
    const [v, setV] = React.useState([30])
    return <Slider value={v} onValueChange={setV} label="Capacity" output={(x) => `${x[0]}%`} />
  },
}
