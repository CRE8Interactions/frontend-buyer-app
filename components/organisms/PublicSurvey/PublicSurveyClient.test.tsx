import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({
  token: "public-token",
  search: "r=recipient",
  pathname: "/s/public-token",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: nav.token }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("@/lib/api", () => ({
  getPublicSurvey: vi.fn(),
  startPublicSurvey: vi.fn(),
  submitPublicSurvey: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  isLoggedIn: vi.fn(() => false),
  setLastKnown: vi.fn(),
}));

import PublicSurveyClient from "@/components/organisms/PublicSurvey/PublicSurveyClient";
import {
  getPublicSurvey,
  startPublicSurvey,
  submitPublicSurvey,
} from "@/lib/api";
import { isLoggedIn, setLastKnown } from "@/lib/auth";

const mockedGet = vi.mocked(getPublicSurvey);
const mockedStart = vi.mocked(startPublicSurvey);
const mockedSubmit = vi.mocked(submitPublicSurvey);
const mockedLoggedIn = vi.mocked(isLoggedIn);
const mockedRemember = vi.mocked(setLastKnown);

describe("Public survey page", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    if (!window.crypto.randomUUID) {
      window.crypto.randomUUID = (() => "test-idempotency-key") as typeof window.crypto.randomUUID;
    }
    nav.token = "public-token";
    nav.search = "r=recipient";
    nav.pathname = "/s/public-token";
    mockedLoggedIn.mockReturnValue(false);
    mockedGet.mockReset();
    mockedStart.mockReset();
    mockedSubmit.mockReset();
    mockedRemember.mockReset();
  });

  it("sends a logged-out fan to sign in for an identified survey", async () => {
    mockedGet.mockResolvedValue({
      data: {
        title: "Season survey",
        state: "open",
        responseMode: "identified",
        questions: [{ uuid: "q1", title: "How was it?", type: "short_text" }],
      },
    } as never);

    render(<PublicSurveyClient />);

    const link = await screen.findByRole("link", { name: "Sign in" });
    expect(screen.getByText("Sign in to take this survey.")).toBeInTheDocument();
    expect(screen.queryByText("This survey is unavailable.")).not.toBeInTheDocument();
    expect(screen.queryByText("How was it?")).not.toBeInTheDocument();
    expect(mockedStart).not.toHaveBeenCalled();
    expect(link).toHaveAttribute(
      "href",
      `/login/?from=${encodeURIComponent("/s/public-token?r=recipient")}`,
    );

    await userEvent.click(link);
    expect(mockedRemember).toHaveBeenCalledWith("/s/public-token?r=recipient");
  });

  it("shows sign in when the public fetch already requires it", async () => {
    mockedGet.mockResolvedValue({
      data: {
        title: "Season survey",
        state: "sign_in_required",
        responseMode: "identified",
      },
    } as never);

    render(<PublicSurveyClient />);

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(mockedStart).not.toHaveBeenCalled();
  });

  it("treats a sign-in 401 from start as a sign-in path", async () => {
    mockedLoggedIn.mockReturnValue(true);
    mockedGet.mockResolvedValue({
      data: {
        title: "Season survey",
        state: "open",
        responseMode: "identified",
        questions: [],
      },
    } as never);
    mockedStart.mockRejectedValue({
      response: {
        status: 401,
        data: {
          error: {
            message: "Sign in to take this survey",
            code: "SIGN_IN_REQUIRED",
          },
        },
      },
    });

    render(<PublicSurveyClient />);

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Sign in to take this survey")).toBeInTheDocument();
    expect(screen.queryByText("This survey is unavailable.")).not.toBeInTheDocument();
    await waitFor(() => expect(mockedStart).toHaveBeenCalledTimes(1));
  });

  it("titles the tab with the survey and org name once the survey loads", async () => {
    mockedGet.mockResolvedValue({
      data: {
        title: "Game day",
        state: "open",
        responseMode: "anonymous",
        branding: { orgName: "Houston Bulls" },
        questions: [],
        logic: [],
      },
    } as never);
    mockedStart.mockResolvedValue({ data: { state: "started" } } as never);

    render(<PublicSurveyClient />);

    expect(await screen.findByRole("button", { name: "Submit" })).toBeInTheDocument();
    expect(document.title).toBe("Survey - Houston Bulls");
  });

  it("still starts an anonymous survey for a logged-out fan", async () => {
    mockedGet.mockResolvedValue({
      data: {
        title: "Game day",
        state: "open",
        responseMode: "anonymous",
        questions: [],
        logic: [],
      },
    } as never);
    mockedStart.mockResolvedValue({ data: { state: "started" } } as never);

    render(<PublicSurveyClient />);

    expect(await screen.findByRole("button", { name: "Submit" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    await waitFor(() => expect(mockedStart).toHaveBeenCalledTimes(1));
  });

  it("drops a follow-up answer after that question is hidden and still submits", async () => {
    mockedGet.mockResolvedValue({
      data: {
        title: "Game day",
        state: "open",
        responseMode: "anonymous",
        questions: [
          {
            uuid: "return",
            type: "yes_no",
            title: "Will you come back?",
            required: true,
            configuration: {},
          },
          {
            uuid: "why",
            type: "long_text",
            title: "Why not?",
            required: true,
            configuration: {},
          },
        ],
        logic: [
          {
            sourceQuestionUuid: "return",
            operator: "equals",
            comparisonValue: "no",
            targetQuestionUuid: "why",
            action: "show",
          },
        ],
      },
    } as never);
    mockedStart.mockResolvedValue({ data: { state: "started" } } as never);
    mockedSubmit.mockResolvedValue({ data: { state: "completed" } } as never);

    render(<PublicSurveyClient />);

    expect(await screen.findByRole("button", { name: "Submit" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    await userEvent.type(screen.getByRole("textbox"), "Parking");
    await userEvent.click(screen.getByRole("radio", { name: "Yes" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
    expect(mockedSubmit.mock.calls[0][1]).toMatchObject({
      answers: { return: { value: "yes" } },
    });
    expect(
      screen.queryByText("This question is not part of the published survey"),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Thank you" })).toBeInTheDocument();
  });
});
