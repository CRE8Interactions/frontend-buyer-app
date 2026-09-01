import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_SESSION } from "@/lib/demo/fixtures";
import { clearSession, setSession, useAuth } from "@/lib/auth";

describe("useAuth session broadcast", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("signs in mounted consumers when login stores a session in this tab", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);

    // Login soft-navigates now, so this component is never remounted and
    // `storage` never fires in its own tab.
    act(() => setSession(DEMO_SESSION));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe(DEMO_SESSION.user.email);
  });

  it("signs mounted consumers out when the session is cleared", () => {
    setSession(DEMO_SESSION);
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(true);

    act(() => clearSession());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
