import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_SESSION, DEMO_USER } from "@/lib/demo/fixtures";

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: () => sessionMocks.getSession(),
  setSession: (session: unknown) => sessionMocks.setSession(session),
}));

vi.mock("@/lib/api", () => ({
  updateSmsOptIn: vi.fn(),
}));

import ProfileSmsPreference from "@/components/molecules/ProfileSmsPreference";
import { updateSmsOptIn } from "@/lib/api";

const mockedUpdateSmsOptIn = vi.mocked(updateSmsOptIn);

describe("ProfileSmsPreference", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReset();
    sessionMocks.setSession.mockReset();
    mockedUpdateSmsOptIn.mockReset();
  });

  it("saves a checked preference and stores the returned session", async () => {
    const user = userEvent.setup();
    const saved = {
      ...DEMO_SESSION,
      user: { ...DEMO_USER, smsOptIn: true },
    };
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedUpdateSmsOptIn.mockResolvedValue({ data: saved } as never);

    render(<ProfileSmsPreference />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockedUpdateSmsOptIn).toHaveBeenCalledWith({
        data: { smsOptIn: true },
      });
    });
    expect(sessionMocks.setSession).toHaveBeenCalledWith(saved);
    expect(
      await screen.findByText("Your text message preference has been updated."),
    ).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it("restores the previous checkbox when the save fails", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue({
      ...DEMO_SESSION,
      user: { ...DEMO_USER, smsOptIn: true },
    });
    mockedUpdateSmsOptIn.mockRejectedValue(new Error("offline"));

    render(<ProfileSmsPreference />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    await user.click(checkbox);

    expect(
      await screen.findByText(
        "Your text message preference could not be saved. Try again.",
      ),
    ).toBeInTheDocument();
    expect(checkbox).toBeChecked();
    expect(sessionMocks.setSession).not.toHaveBeenCalled();
  });
});
