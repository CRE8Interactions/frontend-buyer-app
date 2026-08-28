import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PhoneNumberInput, {
  PHONE_ERROR,
} from "@/components/molecules/PhoneNumberInput";
import { DEMO_USER } from "@/lib/demo/fixtures";

function countrySelect() {
  return screen.getByLabelText(/phone number country/i) as HTMLSelectElement;
}

describe("PhoneNumberInput", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the IPData country when NEXT_PUBLIC_IP_DATA_API_KEY is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_IP_DATA_API_KEY", "test-ipdata-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: "GB" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PhoneNumberInput value={undefined} onChange={() => {}} />);

    await waitFor(() => {
      expect(countrySelect().value).toBe("GB");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.ipdata.co?api-key=test-ipdata-key"),
      expect.anything(),
    );
  });

  it("falls back to US when the IPData lookup fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_IP_DATA_API_KEY", "test-ipdata-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network")),
    );

    render(<PhoneNumberInput value={undefined} onChange={() => {}} />);

    expect(countrySelect().value).toBe("US");
    await waitFor(() => {
      expect(countrySelect().value).toBe("US");
    });
  });

  it("updates the country flag when an international number is entered", () => {
    render(
      <PhoneNumberInput value="+442079460958" onChange={() => {}} />,
    );

    expect(countrySelect().value).toBe("GB");
  });

  it("autofocuses the number, not the country picker", () => {
    render(
      <PhoneNumberInput value={undefined} onChange={() => {}} autoFocus />,
    );

    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("shows the existing-phone message from the fixture flow", () => {
    render(
      <PhoneNumberInput
        value={DEMO_USER.phoneNumber}
        onChange={() => {}}
        error="exists"
      />,
    );

    expect(screen.getByText(PHONE_ERROR.exists)).toBeInTheDocument();
  });
});
