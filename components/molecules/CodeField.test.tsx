import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CodeField from "@/components/molecules/CodeField";

function Harness({ onComplete }: { onComplete?: (code: string) => void }) {
  const [code, setCode] = useState("");
  return <CodeField value={code} onChange={setCode} onComplete={onComplete} />;
}

/** What each box shows, left to right. */
function boxes() {
  return screen
    .getAllByRole("textbox")
    .map((box) => (box as HTMLInputElement).value);
}

describe("CodeField boxes", () => {
  it("carries the cursor through the boxes as the code is typed", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const first = screen.getByLabelText(/six-digit code/i);

    await user.click(first);
    expect(first).toHaveFocus();

    await user.keyboard("12");
    expect(boxes()).toEqual(["1", "2", "", "", "", ""]);
    expect(screen.getByLabelText(/digit 3 of 6/i)).toHaveFocus();

    await user.keyboard("3456");
    expect(boxes()).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("steps back on backspace and ignores anything that is not a digit", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText(/six-digit code/i));
    await user.keyboard("12ab");
    expect(boxes()).toEqual(["1", "2", "", "", "", ""]);

    await user.keyboard("{Backspace}");
    expect(boxes()).toEqual(["1", "", "", "", "", ""]);
    expect(screen.getByLabelText(/digit 2 of 6/i)).toHaveFocus();
  });
});
