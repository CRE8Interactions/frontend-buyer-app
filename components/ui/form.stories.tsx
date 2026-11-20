import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "./button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./form"
import { Input } from "./input"

const meta = {
  title: "Forms & inputs/Form",
  id: "molecules-form",
  component: Form,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "react-hook-form wiring with zod validation. FormMessage shows the field error. Same spacing and type as Field: 4px gap, 12px muted description, 12px red message." } } },
} satisfies Meta<typeof Form>
export default meta
type Story = StoryObj<typeof meta>

const schema = z.object({
  name: z.string().min(2, "Enter the name on your ticket."),
  email: z.string().email("Enter a valid email address."),
})

function Checkout({ invalid }: { invalid?: boolean }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: invalid ? { name: "A", email: "alex@" } : { name: "", email: "" },
    mode: "onChange",
  })
  if (invalid) void form.trigger()
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="flex max-w-sm flex-col gap-5">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name on ticket</FormLabel><FormControl><Input placeholder="Alex Rivera" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="alex@example.com" {...field} /></FormControl><FormDescription>Tickets are sent here.</FormDescription><FormMessage /></FormItem>
        )} />
        <Button type="submit">Continue to payment</Button>
      </form>
    </Form>
  )
}

export const Default: Story = { args: {} as never, render: () => <Checkout /> }
export const WithErrors: Story = { args: {} as never, render: () => <Checkout invalid /> }
