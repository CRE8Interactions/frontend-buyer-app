import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmailField from "@/components/molecules/EmailField";
import { DEMO_USER } from "@/lib/demo/fixtures";

describe("EmailField", () => {
  it("mirrors native input events so Safari autofill updates the parent", () => {
    const onChange = vi.fn();
    render(
      <EmailField
        id="email"
        value=""
        onChange={onChange}
        placeholder="you@email.com"
      />,
    );

    fireEvent.input(screen.getByLabelText(/email address/i), {
      target: { value: DEMO_USER.email },
    });

    expect(onChange).toHaveBeenCalledWith(DEMO_USER.email);
  });

  it("passes the current field value to blur", () => {
    const onBlur = vi.fn();
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <EmailField id="email" value={value} onChange={setValue} onBlur={onBlur} />
      );
    }
    render(<Harness />);

    const field = screen.getByLabelText(/email address/i);
    fireEvent.input(field, { target: { value: "not-an-email" } });
    fireEvent.blur(field);

    expect(onBlur).toHaveBeenCalledWith("not-an-email");
  });
});
