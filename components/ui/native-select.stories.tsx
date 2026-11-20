import * as React from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CaretUpDown } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Description } from "./description"
import { Label } from "./label"
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption, type NativeSelectProps } from "./native-select"

const meta = {
  title: "Select & pickers/Native select",
  id: "atoms-nativeselect",
  component: NativeSelect,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "tertiary"] },
    size: { control: "inline-radio", options: ["default", "sm", "lg"] },
  },
  decorators: [
    (Story, { viewMode }) => (
      <div className={cn("grid grid-cols-[minmax(0,1fr)] place-items-center", viewMode === "story" && "min-h-[calc(100dvh-3rem)]")}>
        <Story />
      </div>
    ),
  ],
  parameters: { docs: { description: { component: "A styled HTML select with the browser’s native picker, keyboard navigation, and form validation. The default chevron is inset in a 16px indicator." } } },
} satisfies Meta<typeof NativeSelect>
export default meta
type Story = StoryObj<typeof meta>

const narrow = "w-[220px] max-w-full"

const statusOptions = (
  <>
    <NativeSelectOption value="">Select status</NativeSelectOption>
    <NativeSelectOption value="todo">Todo</NativeSelectOption>
    <NativeSelectOption value="in-progress">In Progress</NativeSelectOption>
    <NativeSelectOption value="done">Done</NativeSelectOption>
    <NativeSelectOption value="cancelled">Cancelled</NativeSelectOption>
  </>
)

function SelectField({ label, description, children, ...props }: NativeSelectProps & {
  label: string
  description?: string
}) {
  const id = React.useId()
  const descriptionId = description ? id + "-description" : undefined

  return (
    <div className="grid gap-1">
      <Label htmlFor={id} isInvalid={props["aria-invalid"] === true}>{label}</Label>
      <NativeSelect id={id} aria-describedby={descriptionId} fullWidth {...props}>{children}</NativeSelect>
      {description && <Description id={descriptionId}>{description}</Description>}
    </div>
  )
}

export const Default: Story = {
  render: () => (
    <div className={narrow}><NativeSelect fullWidth aria-label="Status">{statusOptions}</NativeSelect></div>
  ),
}

export const Playground: Story = {
  render: (args) => (
    <div className={narrow}><NativeSelect aria-label="Status" fullWidth {...args}>{statusOptions}</NativeSelect></div>
  ),
}

const states = [
  ["california", "California"],
  ["texas", "Texas"],
  ["florida", "Florida"],
  ["new-york", "New York"],
  ["illinois", "Illinois"],
] as const

export const Controlled: Story = {
  render: function Render() {
    const [state, setState] = React.useState<string>("california")
    const selectedLabel = states.find(([value]) => value === state)?.[1]
    return (
      <div className={cn(narrow, "grid gap-2")}>
        <SelectField label="State (controlled)" name="state" value={state} onChange={(event) => setState(event.currentTarget.value)}>
          <NativeSelectOption value="">Select a state</NativeSelectOption>
          {states.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
        </SelectField>
        <output className="text-sm text-h-muted">Selected: {selectedLabel ?? "None"}</output>
      </div>
    )
  },
}

export const CustomIndicator: Story = {
  render: () => (
    <div className={narrow}>
      <SelectField label="Priority" name="priority" indicator={<CaretUpDown weight="bold" />}>
        <NativeSelectOption value="">Select priority</NativeSelectOption>
        {["Low", "Medium", "High", "Critical"].map((label) => (
          <NativeSelectOption key={label} value={label.toLowerCase()}>{label}</NativeSelectOption>
        ))}
      </SelectField>
    </div>
  ),
}

export const Disabled: Story = {
  name: "Disabled Select",
  render: () => (
    <div className={narrow}><SelectField label="Status" name="status" disabled defaultValue="done">{statusOptions}</SelectField></div>
  ),
}

const countries = [
  { region: "North America", options: [["us", "United States"], ["ca", "Canada"], ["mx", "Mexico"]] },
  { region: "Europe", options: [["uk", "United Kingdom"], ["fr", "France"], ["de", "Germany"]] },
  { region: "Asia", options: [["jp", "Japan"], ["kr", "South Korea"], ["in", "India"]] },
] as const

export const FormExample: Story = {
  render: function Render() {
    const [result, setResult] = React.useState("")
    return (
      <form
        className="grid w-[300px] max-w-full gap-4"
        onChange={() => setResult("")}
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setResult(`Submitted country ${data.get("country")} with role ${data.get("role")}.`)
        }}
      >
        <SelectField label="Country" name="country" required>
          <NativeSelectOption value="">Select a country</NativeSelectOption>
          {countries.map(({ region, options }) => (
            <NativeSelectOptGroup key={region} label={region}>
              {options.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
            </NativeSelectOptGroup>
          ))}
        </SelectField>
        <SelectField label="Role" name="role" required description="Choose a permission level for the user.">
          <NativeSelectOption value="">Select a role</NativeSelectOption>
          <NativeSelectOption value="admin">Admin</NativeSelectOption>
          <NativeSelectOption value="editor">Editor</NativeSelectOption>
          <NativeSelectOption value="viewer">Viewer</NativeSelectOption>
        </SelectField>
        <Button type="submit" className="h-10 md:h-10">Submit</Button>
        {result && <output className="text-sm text-h-muted">{result}</output>}
      </form>
    )
  },
}

export const FullWidth: Story = {
  render: () => (
    <div className="w-[400px] max-w-full"><SelectField label="Status" name="status">{statusOptions}</SelectField></div>
  ),
}

export const Invalid: Story = {
  name: "Invalid State",
  render: () => (
    <div className={narrow}><SelectField label="Status" name="status" aria-invalid>{statusOptions}</SelectField></div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div className="grid w-[464px] max-w-full grid-cols-1 gap-6 min-[512px]:grid-cols-2">
      {(["primary", "secondary"] as const).map((variant) => (
        <label key={variant} className="grid min-w-0 gap-2 text-xs text-h-muted">
          {variant}
          <NativeSelect variant={variant} fullWidth>{statusOptions}</NativeSelect>
        </label>
      ))}
    </div>
  ),
}

export const WithLabelAndDescription: Story = {
  name: "With Description",
  render: () => (
    <div className={narrow}>
      <SelectField label="Status" name="status" description="Choose the current task status">{statusOptions}</SelectField>
    </div>
  ),
}

export const WithDisabledOptions: Story = {
  render: () => (
    <div className={narrow}>
      <SelectField label="Animal" name="animal">
        <NativeSelectOption value="">Select an animal</NativeSelectOption>
        <NativeSelectOption value="dog">Dog</NativeSelectOption>
        <NativeSelectOption value="cat" disabled>Cat (unavailable)</NativeSelectOption>
        <NativeSelectOption value="bird">Bird</NativeSelectOption>
        <NativeSelectOption value="kangaroo" disabled>Kangaroo (unavailable)</NativeSelectOption>
        <NativeSelectOption value="elephant">Elephant</NativeSelectOption>
      </SelectField>
    </div>
  ),
}

const departments = [
  { group: "Engineering", roles: ["Frontend", "Backend", "DevOps"] },
  { group: "Sales", roles: ["Sales Rep", "Account Manager", "Sales Director"] },
  { group: "Operations", roles: ["Customer Support", "Product Manager", "Operations Manager"] },
]

export const Grouped: Story = {
  name: "With Groups",
  render: () => (
    <NativeSelect aria-label="Department">
      <NativeSelectOption value="">Select department</NativeSelectOption>
      {departments.map(({ group, roles }) => (
        <NativeSelectOptGroup key={group} label={group}>
          {roles.map((role) => <NativeSelectOption key={role}>{role}</NativeSelectOption>)}
        </NativeSelectOptGroup>
      ))}
    </NativeSelect>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className={narrow}><SelectField label="Status" name="status" description="Choose the current task status">{statusOptions}</SelectField></div>
  ),
}

export const Small: Story = {
  render: () => (
    <div className={narrow}><NativeSelect aria-label="Status" fullWidth size="sm">{statusOptions}</NativeSelect></div>
  ),
}
