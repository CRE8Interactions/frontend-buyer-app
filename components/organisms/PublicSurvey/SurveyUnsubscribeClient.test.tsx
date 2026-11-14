import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("@/lib/api", () => ({
  unsubscribeSurvey: vi.fn(),
}));

import SurveyUnsubscribeClient from "@/components/organisms/PublicSurvey/SurveyUnsubscribeClient";
import { unsubscribeSurvey } from "@/lib/api";

const mockedUnsubscribe = vi.mocked(unsubscribeSurvey);

describe("Survey unsubscribe page", () => {
  beforeEach(() => {
    nav.search = "";
    mockedUnsubscribe.mockReset();
    mockedUnsubscribe.mockResolvedValue({ data: { ok: true } } as never);
  });

  it("says the link is not valid when the token is missing", () => {
    render(<SurveyUnsubscribeClient />);

    expect(screen.getByText("This unsubscribe link is not valid.")).toBeInTheDocument();
    expect(mockedUnsubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes when the link includes a token", async () => {
    nav.search = "token=leave-me-out";
    render(<SurveyUnsubscribeClient />);

    expect(
      await screen.findByText(
        "You are unsubscribed from survey messages for this organization.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedUnsubscribe).toHaveBeenCalledWith("leave-me-out"),
    );
  });

  it("titles the tab with the org name after unsubscribing", async () => {
    nav.search = "token=leave-me-out";
    mockedUnsubscribe.mockResolvedValue({
      data: { ok: true, organizationName: "Houston Bulls" },
    } as never);
    render(<SurveyUnsubscribeClient />);

    await waitFor(() => expect(document.title).toBe("Unsubscribe - Houston Bulls"));
  });

  it("titles the tab plain Unsubscribe when no org name is known", () => {
    render(<SurveyUnsubscribeClient />);

    expect(document.title).toBe("Unsubscribe");
  });
});
