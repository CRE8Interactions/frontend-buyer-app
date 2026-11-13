import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OfferChipScroller from "@/components/molecules/OfferChipScroller";

describe("OfferChipScroller", () => {
  it("shows the next offers button when the row overflows and scrolls it", () => {
    render(
      <OfferChipScroller>
        <button type="button" data-offer-id="field">Field Club</button>
      </OfferChipScroller>,
    );
    const scroller = screen.getByTestId("offer-chip-scroller");
    Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: 800 });
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 200 });
    fireEvent.scroll(scroller);

    fireEvent.click(screen.getByRole("button", { name: "Show more offers" }));
    expect(scroller.scrollLeft).toBe(180);
  });

  it("does not show offer scroll buttons when every chip fits", () => {
    render(
      <OfferChipScroller>
        <button type="button">All</button>
      </OfferChipScroller>,
    );
    expect(screen.queryByRole("button", { name: "Show more offers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show previous offers" })).not.toBeInTheDocument();
  });
});
