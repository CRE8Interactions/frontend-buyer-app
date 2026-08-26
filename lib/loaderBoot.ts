import {
  LOADER_BRANDING_COOKIE,
  PLATFORM_PAGE_PATHS,
} from "@/lib/orgBrandingCache";
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
    // React re-paints this loader in its own elements once hydrated. Anchoring
    // both to the document clock keeps the motion from restarting on handoff.
    function phase(duration, stagger) {
      var now = 0;
      try { now = performance.now(); } catch (e) {}
      return Math.round((stagger || 0) - (now % duration)) + "ms";
    }
    var path = location.pathname || "";
    var norm = path.replace(/\\/+$/, "") || "/";
    var loginReturnsToTenant =
      norm === "/login" && /[?&]from=[^&]/.test(location.search || "");
    var wallet = /^\\/wallet\\/(?:my-tickets|my-transfers|giving|my-profile)(?:\\/|$)/.test(norm);
    var fromTenant = false;
    try { fromTenant = read("bt_wallet_entry_from_tenant") === "1"; } catch (e) {}
    if (!fromTenant) {
      try {
        var parts0 = document.cookie.split("; ");
        for (var c = 0; c < parts0.length; c++) {
          if (parts0[c].indexOf("bt_wallet_entry_from_tenant=1") === 0) { fromTenant = true; break; }
        }
      } catch (e) {}
    }
    var walletTenant = wallet && fromTenant ? last() : null;
    var platPages = ${JSON.stringify(PLATFORM_PAGE_PATHS)};
    if (
      platPages.indexOf(norm) !== -1 ||
      (norm === "/login" && !loginReturnsToTenant) ||
      (wallet && !walletTenant)
    ) {
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
      var platMotion = document.createElement("style");
      platMotion.textContent = "@keyframes bt-boot-stack{0%,12%{opacity:0;transform:translateY(10px) scale(.86)}26%,74%{opacity:1;transform:translateY(0) scale(1)}88%,100%{opacity:0;transform:translateY(-10px) scale(.86)}}";
      plat.appendChild(platMotion);
      var bars = document.createElement("div");
      bars.setAttribute("data-bt-boot-spinner", "");
      bars.style.cssText = "display:flex;align-items:flex-end;gap:7px;height:34px;";
      for (var bar = 0; bar < 5; bar++) {
        var dot = document.createElement("span");
        dot.style.cssText = "width:12px;height:12px;border-radius:3px;background:" + (bar < 3 ? "#a6e773" : "#7fbe4d") + ";animation:bt-boot-stack 1.5s ease-in-out infinite;animation-delay:" + phase(1500, bar * 120) + ";";
        bars.appendChild(dot);
      }
      plat.appendChild(bars);
      document.documentElement.appendChild(plat);
      return;
    }
    if (norm === "/login") return;
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
          if (!/^(browse|login|sign-out|search|checkout|settings|www|menu|group|fundraise|e|venue|privacy-policy|terms-conditions|purchase-policy|cookies-policy|disclaimer|my-events|my-transfers|my-listings|my-collectables|my-packages|guest-passes|event-details|my-tickets|my-profile|giving|wallet|concert|nm-state-ticketing|season-tickets|flex-pack)$/.test(seg)) org = seg;
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
      var motion = document.createElement("style");
      motion.textContent = "@keyframes bt-boot-spin{to{transform:rotate(360deg)}}@keyframes bt-boot-breathe{0%,100%{opacity:.55}50%{opacity:1}}";
      el.appendChild(motion);
      var ring = document.createElement("div");
      ring.setAttribute("data-bt-boot-spinner", "");
      ring.style.cssText = "position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center;";
      ring.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;animation:bt-boot-spin 1.5s linear infinite;animation-delay:' + phase(1500) + '"><circle cx="60" cy="60" r="55" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3"></circle><circle cx="60" cy="60" r="55" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-dasharray="86 260"></circle></svg>';
      var wrap = document.createElement("div");
      wrap.style.cssText = "width:96px;height:96px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;box-shadow:0 8px 30px rgba(0,0,0,0.18);";
      var img = document.createElement("img");
      img.src = logo;
      img.alt = "";
      img.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;animation:bt-boot-breathe 1.8s ease-in-out infinite;animation-delay:" + phase(1800) + ";";
      wrap.appendChild(img);
      ring.appendChild(wrap);
      el.appendChild(ring);
    }
    var caption = document.createElement("div");
    caption.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;";
    if (typeof b.name === "string" && b.name) {
      var title = document.createElement("div");
      title.textContent = b.name;
      title.style.cssText = "font-size:17px;font-weight:600;letter-spacing:-0.02em;color:#fff;";
      caption.appendChild(title);
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
    caption.appendChild(msg);
    el.appendChild(caption);
    document.documentElement.appendChild(el);
  } catch (e) {}
})();`;
