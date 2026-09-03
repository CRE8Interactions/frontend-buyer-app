import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExpandableDescription from "@/components/molecules/ExpandableDescription";

describe("ExpandableDescription", () => {
  it("omits More when the copy fits within the clamp", () => {
    render(<ExpandableDescription text="Short offer copy." mobile={false} />);
    expect(screen.getByText("Short offer copy.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more/i })).not.toBeInTheDocument();
  });

  it("expands and collapses long copy with More and Less", async () => {
    const user = userEvent.setup();
    const longText = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}.`).join(
      " ",
    );

    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(240);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(80);

    render(<ExpandableDescription text={longText} mobile={false} />);

    expect(screen.getByRole("button", { name: /^more$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^more$/i }));
    expect(screen.getByRole("button", { name: /^less$/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /^less$/i }));
    expect(screen.getByRole("button", { name: /^more$/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    vi.restoreAllMocks();
  });
});
