import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DobField from "@/components/molecules/DobField";
import { DEMO_USER } from "@/lib/demo/fixtures";

function ControlledDobField() {
  const [value, setValue] = useState("");
  return <DobField value={value} onChange={setValue} />;
}

describe("DobField", () => {
  it("types the demo date and keeps the caret at a middle backspace", async () => {
    const user = userEvent.setup();
    render(<ControlledDobField />);
    const input = screen.getByLabelText(/birth date/i) as HTMLInputElement;

    await user.type(input, DEMO_USER.dob);
    expect(input).toHaveValue(DEMO_USER.dob);

    input.setSelectionRange(2, 2);
    await user.keyboard("{Backspace}");

    expect(input).toHaveValue("0/01/1995");
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
  });

  it("continues in the next block after changing the digit before a slash", async () => {
    const user = userEvent.setup();
    render(<ControlledDobField />);
    const input = screen.getByLabelText(/birth date/i) as HTMLInputElement;

    await user.type(input, DEMO_USER.dob);
    input.setSelectionRange(4, 4);
    await user.keyboard("5");

    expect(input).toHaveValue("01/05/1995");
    expect(input.selectionStart).toBe(6);
    expect(input.selectionEnd).toBe(6);
  });

  it("replaces year digits and keeps moving instead of jumping to the end", async () => {
    const user = userEvent.setup();
    render(<ControlledDobField />);
    const input = screen.getByLabelText(/birth date/i) as HTMLInputElement;

    await user.type(input, DEMO_USER.dob);
    input.setSelectionRange(6, 6);
    await user.keyboard("20");

    expect(input).toHaveValue("01/01/2095");
    expect(input.selectionStart).toBe(8);
    expect(input.selectionEnd).toBe(8);
  });

  it("removes the slash when backspace empties the field", async () => {
    const user = userEvent.setup();
    render(<ControlledDobField />);
    const input = screen.getByLabelText(/birth date/i) as HTMLInputElement;

    await user.type(input, "011");
    expect(input).toHaveValue("01/1");
    await user.keyboard("{Backspace}{Backspace}{Backspace}{Backspace}");

    expect(input).toHaveValue("");
  });

  it("shows the next slash after typing the month and removes it on backspace", async () => {
    const user = userEvent.setup();
    render(<ControlledDobField />);
    const input = screen.getByLabelText(/birth date/i) as HTMLInputElement;

    await user.type(input, "02");
    expect(input).toHaveValue("02/");
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("02");

    await user.type(input, "01");
    expect(input).toHaveValue("02/01/");
  });

  it("does not leave a slash after backspacing the day", async () => {
    const user = userEvent.setup();
    render(<ControlledDobField />);
    const input = screen.getByLabelText(/birth date/i) as HTMLInputElement;

    await user.type(input, "02011");
    expect(input).toHaveValue("02/01/1");
    await user.keyboard("{Backspace}{Backspace}{Backspace}");

    expect(input).toHaveValue("02");
  });
});
