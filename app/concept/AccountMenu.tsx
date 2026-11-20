"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArrowsLeftRight, Compass, Gear, SignOut, Ticket } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WALLET_SECTIONS } from "@/lib/walletSections";
import { displayName, useAuth } from "@/lib/auth";

/* The right-hand end of the ticket buyer's bar. Signed out it is the Log in button; signed in it is the account menu: the buyer's initials in a
   circle open a card with their name and email, the wallet sections, and Log out. */
export type DemoAccount = { name: string; email: string };

const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

type Row = { label: string; href: string; icon: ReactNode };

function AccountDropdown({ name, email, rows, onLogout, hideOnPhone }: { name: string; email?: string; rows: Row[]; onLogout: () => void; /** a phone has the account in the wallet's own dock (Profile), so the bar does not repeat it */ hideOnPhone?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Account menu for ${name}`} className={`${hideOnPhone ? "max-md:hidden " : ""}h-focus-ring inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-transform active:scale-95 motion-reduce:transition-none`}>
          <Avatar size="md" color="accent" variant="soft"><AvatarFallback>{initials(name)}</AvatarFallback></Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
          <Avatar size="md" color="accent" variant="soft"><AvatarFallback>{initials(name)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-h-foreground">{name}</span>
            {email && <span className="block truncate text-xs text-h-muted">{email}</span>}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {rows.map((r) => (
            <DropdownMenuItem key={r.href} asChild><a href={r.href}>{r.icon}{r.label}</a></DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" icon={<SignOut weight="bold" />} onSelect={onLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AccountMenu({ login = true, demo }: { login?: boolean; demo?: DemoAccount }) {
  const { user, ready, isAuthenticated, logout } = useAuth();
  const path = usePathname();

  /* The demo wallet has no session yet: it passes the sample buyer, and the menu points at the wallet's own screens. */
  if (demo) {
    const rows: Row[] = [
      { label: "Tickets", href: "/wallet#tickets", icon: <Ticket weight="bold" /> },
      { label: "Transfers", href: "/wallet#transfers", icon: <ArrowsLeftRight weight="bold" /> },
      { label: "Profile and settings", href: "/wallet#profile", icon: <Gear weight="bold" /> },
      { label: "Browse events", href: "/browse", icon: <Compass weight="bold" /> },
    ];
    return <AccountDropdown name={demo.name} email={demo.email} rows={rows} hideOnPhone onLogout={() => window.location.assign("/login")} />;
  }

  if (ready && isAuthenticated && user) {
    const rows: Row[] = [
      { label: "Wallet", href: "/wallet", icon: <Ticket weight="bold" /> },
      ...WALLET_SECTIONS.map((s) => ({ label: s.label, href: s.href, icon: s.icon })),
    ];
    return <AccountDropdown name={displayName(user)} email={user.email} rows={rows} onLogout={() => { logout(); window.location.assign("/browse/"); }} />;
  }

  if (!login) return null;
  /* until the session is known, hold the account circle's place instead of flashing Log in */
  if (!ready) return <span aria-hidden className="inline-block size-10 shrink-0 rounded-full bg-h-default" />;
  /* after logging in, come back to this page */
  const from = path && !path.startsWith("/login") ? `?from=${encodeURIComponent(path)}` : "";
  return <Button href={`/login${from}`} size="md">Log in</Button>;
}
