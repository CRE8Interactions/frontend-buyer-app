/**
 * Intercom messenger bootstrap.
 * The CRA frontend only hid the launcher during purchase (assuming GTM loaded it).
 * Here we boot when NEXT_PUBLIC_INTERCOM_APP_ID is set, and still hide on purchase routes.
 */

const INTERCOM_SCRIPT_ID = "intercom-widget-script";

export function getIntercomAppId() {
  return process.env.NEXT_PUBLIC_INTERCOM_APP_ID || "";
}

export function bootIntercom(settings: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const appId = getIntercomAppId();
  if (!appId) return;

  window.intercomSettings = {
    api_base: "https://api-iam.intercom.io",
    app_id: appId,
    ...settings,
  };

  if (typeof window.Intercom === "function") {
    window.Intercom("update", window.intercomSettings);
    return;
  }

  if (document.getElementById(INTERCOM_SCRIPT_ID)) return;

  const i = function (...args: unknown[]) {
    (i as unknown as { c: (a: unknown) => void }).c(args);
  } as unknown as {
    (...args: unknown[]): void;
    q: unknown[];
    c: (args: unknown) => void;
  };
  i.q = [];
  i.c = function (args: unknown) {
    i.q.push(args);
  };
  window.Intercom = i;

  const load = () => {
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.id = INTERCOM_SCRIPT_ID;
    s.src = `https://widget.intercom.io/widget/${appId}`;
    const x = document.getElementsByTagName("script")[0];
    x?.parentNode?.insertBefore(s, x);
  };

  if (document.readyState === "complete") {
    load();
  } else if (window.attachEvent) {
    window.attachEvent("onload", load);
  } else {
    window.addEventListener("load", load, false);
  }
}

export function updateIntercom(settings: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.Intercom !== "function")
    return;
  window.Intercom("update", settings);
}

export function hideIntercomLauncher() {
  updateIntercom({ hide_default_launcher: true });
}

export function showIntercomLauncher() {
  updateIntercom({ hide_default_launcher: false });
}

export function shutdownIntercom() {
  if (typeof window === "undefined" || typeof window.Intercom !== "function")
    return;
  window.Intercom("shutdown");
}
