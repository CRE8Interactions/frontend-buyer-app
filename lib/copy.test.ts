import { describe, expect, it, vi } from "vitest";
import { copy, copyPageUrl } from "@/lib/copy";

describe("copy", () => {
  it("writes the url and marks copied", () => {
    const writeText = vi.fn();
    const setter = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    copy("https://example.com/venue/aggie-memorial-stadium/", setter);

    expect(writeText).toHaveBeenCalledWith(
      "https://example.com/venue/aggie-memorial-stadium/",
    );
    expect(setter).toHaveBeenCalledWith(true);
  });

  it("falls back to execCommand when the clipboard api is missing", () => {
    Object.assign(navigator, { clipboard: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    copy("https://example.com/browse/");

    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});

describe("copyPageUrl", () => {
  it("copies the current page url", () => {
    const writeText = vi.fn();
    const setter = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    copyPageUrl(setter);

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(setter).toHaveBeenCalledWith(true);
  });
});
