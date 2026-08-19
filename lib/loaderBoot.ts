import { LOADER_BRANDING_COOKIE } from "@/lib/orgBrandingCache";
import {
  CHECKOUT_LOADER_MESSAGE,
  CHECKOUT_SUCCESS_LOADER_MESSAGE,
  LOADER_MESSAGE,
} from "@/lib/loaderMessages";

/**
 * Runs before React hydrates. Paints destination-org branding from
 * sessionStorage, or last-used branding only when that team matches this path.
 */
export const LOADER_BOOT_SCRIPT = `(function(){
  try {
    function read(key) {
      try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }
    function parse(raw) {
      if (!raw) return null;
      try {
        var b = JSON.parse(raw);
        if (!b || typeof b.primaryColor !== "string") return null;
        if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(b.primaryColor)) return null;
        return b;
      } catch (e) { return null; }
    }
    function last() {
      var stored = parse(read("bt_org_branding_last"));
      if (stored) return stored;
      var parts = document.cookie.split("; ");
      var prefix = ${JSON.stringify(`${LOADER_BRANDING_COOKIE}=`)};
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(prefix) === 0) {
          return parse(decodeURIComponent(parts[i].slice(prefix.length)));
        }
      }
      return null;
    }
    function forSlug(slug) {
      return slug ? parse(read("bt_org_branding:" + String(slug).toLowerCase())) : null;
    }
    var path = location.pathname || "";
    var norm = path.replace(/\\/+$/, "") || "/";
    if (norm === "/" || norm === "/browse" || norm === "/our-story") {
      var plat = document.createElement("div");
      plat.id = "bt-boot-loader";
      plat.setAttribute("role", "status");
      plat.setAttribute("aria-label", "Loading");
      plat.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;background:#051b35;font-family:system-ui,sans-serif;";
      var lockup = document.createElement("img");
      lockup.src = "/blocktickets-logo.svg";
      lockup.alt = "Blocktickets";
      lockup.style.cssText = "width:196px;";
      plat.appendChild(lockup);
      document.documentElement.appendChild(plat);
      return;
    }
    var b = null;
    var ev = path.match(/^\\/e\\/([^/]+)\\/([^/]+)/);
    var vn = path.match(/^\\/venue\\/([^/]+)/i);
    if (ev) {
      try {
        var em = JSON.parse(read("bt_org_branding_events") || "{}");
        b = forSlug(em[(ev[1] + "/" + ev[2]).toLowerCase()]);
      } catch (e) {}
    } else if (vn) {
      try {
        var vm = JSON.parse(read("bt_org_branding_venues") || "{}");
        b = forSlug(vm[vn[1].toLowerCase()]);
      } catch (e) {}
    } else {
      var org = null;
      var pkg = path.match(/^\\/([^/]+)\\/(?:package|flex-pack)\\//i);
      if (pkg && pkg[1].toLowerCase() !== "venue") org = pkg[1].toLowerCase();
      else {
        var one = path.match(/^\\/([^/]+)\\/?$/);
        if (one) {
          var seg = one[1].toLowerCase();
          if (!/^(browse|login|search|checkout|settings|www|menu|group|fundraise|e|venue|privacy-policy|terms-conditions|purchase-policy|cookies-policy|disclaimer|my-events|my-transfers|my-listings|my-collectables|my-packages|guest-passes|event-details|my-tickets|wallet|concert|nm-state-ticketing)$/.test(seg)) org = seg;
        }
      }
      if (org) {
        b = forSlug(org) || last();
        if (!b || !b.slug || String(b.slug).toLowerCase() !== org) return;
      } else {
        b = last();
      }
    }
    if (!b) return;
    var el = document.createElement("div");
    el.id = "bt-boot-loader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", "Loading");
    el.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;background:"+b.primaryColor+";font-family:system-ui,sans-serif;";
    var logo = typeof b.logoSrc === "string" ? b.logoSrc : "";
    if (logo && /^(\\/|https:\\/\\/)/.test(logo)) {
      var wrap = document.createElement("div");
      wrap.style.cssText = "width:96px;height:96px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
      var img = document.createElement("img");
      img.src = logo;
      img.alt = "";
      img.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;";
      wrap.appendChild(img);
      el.appendChild(wrap);
    }
    var msg = document.createElement("div");
    var msgText = ${JSON.stringify(LOADER_MESSAGE)};
    if (norm === "/checkout/checkout-success") {
      msgText = ${JSON.stringify(CHECKOUT_SUCCESS_LOADER_MESSAGE)};
    } else if (norm === "/checkout" || norm.indexOf("/checkout/") === 0) {
      msgText = ${JSON.stringify(CHECKOUT_LOADER_MESSAGE)};
    }
    msg.textContent = msgText;
    msg.style.cssText = "font-size:12px;font-weight:500;color:rgba(255,255,255,0.62);";
    el.appendChild(msg);
    document.documentElement.appendChild(el);
  } catch (e) {}
})();`;
