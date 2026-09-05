import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OnSaleSoonCard from "@/components/molecules/OnSaleSoonCard";

describe("OnSaleSoonCard", () => {
  it("shows the on-sale-soon label and formatted date", () => {
    render(<OnSaleSoonCard scheduledAt="Fri, Aug 28 at 10:00 AM MDT" />);

    expect(screen.getByTestId("ticketing-scheduled")).toBeInTheDocument();
    expect(screen.getByText(/on sale soon/i)).toBeInTheDocument();
    expect(screen.getByText("Fri, Aug 28 at 10:00 AM MDT")).toBeInTheDocument();
    expect(
      screen.getByText(
        /this event does not have any tickets on sale yet\. check back in later\./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows fallback copy when no on-sale time is available", () => {
    render(<OnSaleSoonCard />);

    expect(
      screen.getByText(
        /this event does not have tickets on sale yet\. check back in later\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/on sale soon/i)).toBeInTheDocument();
  });

  it("uses the org accent for the status dot", () => {
    render(
      <OnSaleSoonCard
        accentColor="#8c0032"
        scheduledAt="Fri, Aug 28 at 10:00 AM MDT"
      />,
    );

    const dot = screen
      .getByTestId("ticketing-scheduled")
      .querySelector("span[aria-hidden]");
    expect(dot).toHaveStyle({ background: "rgb(140, 0, 50)" });
  });

  it("centers copy on mobile", () => {
    render(
      <OnSaleSoonCard
        fill
        scheduledAt="Fri, Aug 28 at 10:00 AM MDT"
      />,
    );

    expect(screen.getByTestId("ticketing-scheduled")).toHaveStyle({
      alignItems: "center",
      textAlign: "center",
      justifyContent: "center",
    });
  });

  it("keeps inline desktop copy left-aligned", () => {
    render(
      <OnSaleSoonCard
        desktop
        scheduledAt="Fri, Aug 28 at 10:00 AM MDT"
      />,
    );

    expect(screen.getByTestId("ticketing-scheduled")).not.toHaveStyle({
      textAlign: "center",
    });
  });

  it("centers copy on desktop when filling the page", () => {
    render(
      <OnSaleSoonCard
        desktop
        fill
        scheduledAt="Fri, Aug 28 at 10:00 AM MDT"
      />,
    );

    expect(screen.getByTestId("ticketing-scheduled")).toHaveStyle({
      alignItems: "center",
      textAlign: "center",
      justifyContent: "center",
    });
  });
});
