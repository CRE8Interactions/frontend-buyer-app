import Link from "next/link";
import CopyrightYear from "@/components/atoms/CopyrightYear";

type FootLink = { label: string; href: string; newTab?: boolean };
const FOOT_COLS: { title: string; links: FootLink[] }[] = [
  { title: "Company", links: [
    { label: "Home", href: "/" },
    { label: "Our Story", href: "/our-story" },
    { label: "Sell with us", href: "/sell" },
  ] },
  { title: "For fans", links: [
    { label: "Browse", href: "/browse" },
    { label: "Log in", href: "/wallet" },
  ] },
  { title: "Legal", links: [
    { label: "Purchase Policy", href: "/purchase-policy", newTab: true },
    { label: "Terms & Conditions", href: "/terms-conditions", newTab: true },
    { label: "Privacy Policy", href: "/privacy-policy", newTab: true },
    { label: "Disclaimer", href: "/disclaimer", newTab: true },
    { label: "Cookies Policy", href: "/cookies-policy", newTab: true },
  ] },
  { title: "Support", links: [
    { label: "Help Center", href: "https://help.blocktickets.xyz/en/" },
  ] },
];

/* Site footer shared by /concept, /our-story, /browse and the team pages: a hairline, the two-tone slogan, three quiet columns and the small print. It follows the light and dark theme. */
export default function Footer() {
  return (
    <footer className="n-footer">
      <div className="n-wrap">
        <div className="n-foot-grid">
          <div className="n-foot-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/blocktickets-logo-navy.svg" alt="blocktickets" />
            <p className="n-foot-tag"><b>Build Bigger.</b><span>Block by Block.</span></p>
          </div>
          <nav className="n-foot-cols" aria-label="Footer">
            {FOOT_COLS.map((c) => (
              <div key={c.title}>
                <h4>{c.title}</h4>
                {c.links.map((l) => {
                  const offSite = /^https?:\/\//.test(l.href);
                  const tab = offSite || l.newTab ? { target: "_blank" as const, rel: "noopener noreferrer" } : {};
                  return offSite
                    ? <a key={l.label} href={l.href} {...tab}>{l.label}</a>
                    : <Link key={l.label} href={l.href} {...tab}>{l.label}</Link>;
                })}
              </div>
            ))}
          </nav>
        </div>
        <p className="n-legal">© <CopyrightYear /> blocktickets. All rights reserved · All prices shown all-in.</p>
      </div>
    </footer>
  );
}
