import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { DEMO_FIXTURES_NOW, setDemoReferenceNow } from "@/lib/demo/now";

// Demo fixtures date themselves from the real clock; pin them before any test
// module builds them so fixture dates never shift under the assertions.
setDemoReferenceNow(DEMO_FIXTURES_NOW);

// Hold the clock at the same instant the fixtures are built from, so anything
// that asks whether a demo event is upcoming gets a stable answer. Only Date is
// faked; userEvent and waitFor still need real timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(DEMO_FIXTURES_NOW));
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  document.cookie.split(";").forEach((part) => {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
});
