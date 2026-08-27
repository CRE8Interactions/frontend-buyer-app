import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";

vi.mock("next/navigation", () => ({
  useParams: () => ({ groupCode: "ABC12" }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/group/ABC12/",
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ready: true, isAuthenticated: false, user: null }),
  setLastKnown: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getGroupInvitation: vi.fn(),
}));

import GroupManagePage from "@/app/group/[groupCode]/page";
import { getGroupInvitation } from "@/lib/api";

const mockedInvite = vi.mocked(getGroupInvitation);
const event = DEMO_EVENTS[0];

describe("Group invite page", () => {
  beforeEach(() => {
    mockedInvite.mockReset();
  });

  it("shows the invited event name", async () => {
    mockedInvite.mockResolvedValue({
      data: {
        data: [
          {
            attributes: {
              groupCode: "ABC12",
              event: {
                data: {
                  attributes: {
                    name: event.name,
                    start: event.start,
                    venue: {
                      data: { attributes: { name: event.venue.name } },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    } as never);

    render(<GroupManagePage />);

    expect(screen.getByRole("status", { name: /loading/i })).toHaveAttribute(
      "data-bt-platform-loader",
    );
    expect(screen.getByText("loading group")).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: /manage your group/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /loading/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(event.name)).toBeInTheDocument();
    expect(screen.getByText(/ABC12/)).toBeInTheDocument();
  });

  it("shows not found when the invitation is missing", async () => {
    mockedInvite.mockRejectedValue(new Error("missing"));

    render(<GroupManagePage />);

    expect(
      await screen.findByRole("heading", { name: /group not found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/unable to load this group invitation/i),
    ).toBeInTheDocument();
  });
});
