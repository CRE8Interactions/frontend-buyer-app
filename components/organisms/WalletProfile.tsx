"use client";

/**
 * Profile. Who you are (a profile photo, your name, all editable where they sit), what your
 * membership gets you and exactly how to earn more, then plain lists. Every row edits in place with a
 * control shaped like the thing it edits (see WalletProfileEditors): no dialogs.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Camera, PencilSimple, SignOut } from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { HoldButton } from "@/components/ui/hold-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ResponsiveDialog } from "@/components/organisms/WalletParts";
import WalletRewards from "@/components/organisms/WalletRewards";
import { AddressEditor, CardEditor, VerifiedEditor, type Address, type Card } from "@/components/organisms/WalletProfileEditors";
import type { Membership } from "@/lib/walletMemberships";
import { fmtAddress } from "@/lib/walletUtils";
import { demoLog } from "@/lib/walletDemo";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const spring = { type: "spring", duration: 0.45, bounce: 0.12 } as const;
const H2 = "text-[clamp(20px,1.8vw,24px)] font-semibold tracking-[-0.02em]";

const pickImage = (file: File | undefined, set: (url: string) => void) => {
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { toast("Choose an image under 8 MB."); return; }
  set(URL.createObjectURL(file));
  demoLog("profile-photo", { name: file.name, size: file.size });
};

/* ---------- list rows ---------- */
const rowText = "min-w-0 flex-1 text-left";

/** A row that opens in place: the library accordion item, so the open row (the row and its editor) is one lighter box. */
function EditRow({ id, label, value, editor }: { id: string; label: string; value?: string; editor: React.ReactNode }) {
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="gap-4 px-5 py-4 text-[16px]">
        <span className={rowText}>{label}</span>
        {value && <span className="ms-auto max-w-[60%] text-balance text-right text-[15px] font-normal leading-snug text-ink2">{value}</span>}
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5 pt-1 text-[15px] text-foreground">{editor}</AccordionContent>
    </AccordionItem>
  );
}

/** A row with nothing to open: a label, a hint and maybe a control. */
function Row({ label, value, end, hint, last }: { label: string; value?: string; end?: React.ReactNode; hint?: string; last?: boolean }) {
  return (
    <>
      <div className="flex w-full items-center gap-4 px-5 py-4">
        <span className={rowText}>
          <span className="block text-[16px] font-medium">{label}</span>
          {hint && <span className="mt-0.5 block text-[13px] text-ink2">{hint}</span>}
        </span>
        {value && <span className="max-w-[60%] text-balance text-right text-[15px] leading-snug text-ink2">{value}</span>}
        {end}
      </div>
      {!last && <span aria-hidden className="mx-5 block h-px bg-border" />}
    </>
  );
}

function Group({ title, note, delay, bare, children }: { title: string; note?: string; delay: number; /** a group of one row needs no card round its accordion: the accordion is the card */ bare?: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section aria-label={title} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { ...spring, delay }} className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className={H2}>{title}</h2>
        {note && <p className="mt-1 text-[14px] leading-snug text-ink2">{note}</p>}
      </div>
      <div className={bare ? undefined : "rounded-[28px] bg-card p-2"}>{children}</div>
    </motion.section>
  );
}

export default function WalletProfile({ isBuyer, email: signedInEmail, memberships = [] }: { isBuyer: boolean; email: string; memberships?: Membership[] }) {
  const reduce = useReducedMotion();
  const [name, setName] = useState(isBuyer ? "Jordan Reyes" : "");
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [email, setEmail] = useState(signedInEmail);
  const [phone, setPhone] = useState<string | undefined>(isBuyer ? "+15625550134" : undefined);
  const [card, setCard] = useState<Card | null>(isBuyer ? { brand: "Visa", last4: "4417", exp: "09/29" } : null);
  const [billing, setBilling] = useState<Address | null>(isBuyer ? { street: "88 Ocean Blvd", apt: "", city: "Long Beach", state: "CA", zip: "90802" } : null);
  const [mailing, setMailing] = useState<Address | "same" | null>(isBuyer ? "same" : null);
  const [passkey, setPasskey] = useState(isBuyer);
  const [prefs, setPrefs] = useState({ remindEmail: true, remindText: true, marketing: false });
  const [clubOff, setClubOff] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const done = (msg: string) => { setOpenId(null); toast(msg); };

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const initials = ((name || email).trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
  const phoneShown = phone ? (parsePhoneNumberFromString(phone)?.formatInternational() ?? phone) : "Add a number";
  const saveName = () => { if (!draft.trim()) return; setName(draft.trim()); setEditingName(false); toast("Name saved"); };

  return (
    <div className="flex flex-col gap-12">
      {/* Photo and name */}
      <section aria-label="You">
        <div className="flex items-center gap-4 sm:flex-wrap sm:gap-x-6 sm:gap-y-4">
          <div className="relative shrink-0">
            <span className="flex size-[72px] items-center justify-center overflow-hidden rounded-full bg-secondary text-[24px] font-semibold sm:size-[104px] sm:text-[32px]">
              {photo ? <img src={photo} alt="Your profile photo" className="size-full object-cover" /> : <span aria-hidden>{initials}</span>}
            </span>
            <button type="button" aria-label={photo ? "Change profile photo" : "Add a profile photo"} onClick={() => photoInput.current?.click()}
              className="absolute bottom-0 right-0 flex size-7 sm:size-9 items-center justify-center rounded-full bg-foreground text-background outline-none transition-transform duration-150 ease-[var(--e-out)] hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]">
              <Camera weight="bold" className="size-4 sm:size-[18px]" />
            </button>
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0], setPhoto); e.target.value = ""; }} />
          </div>

          <div className="min-w-0 flex-1 sm:basis-[240px]">
            {editingName ? (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
                <Input aria-label="Your name" size="lg" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditingName(false)} className="max-w-[360px]" />
                <Button type="submit" disabled={!draft.trim()}>Save</Button>
                <Button type="button" variant="tertiary" onClick={() => setEditingName(false)}>Cancel</Button>
              </form>
            ) : (
              <button type="button" onClick={() => { setDraft(name); setEditingName(true); }} className="group flex items-center gap-3 rounded-[16px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]" aria-label={name ? `Edit your name, ${name}` : "Add your name"}>
                <h1 className="text-balance text-[clamp(26px,4.2vw,48px)] font-semibold leading-[1.06] tracking-[-0.03em]">{name || "Add your name"}</h1>
                <PencilSimple weight="bold" className="size-5 shrink-0 text-mute opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
              </button>
            )}
            <p className="mt-1 text-[15px] text-ink2">{isBuyer ? "Member since 2023" : "No orders on this email yet"}</p>
          </div>
        </div>
      </section>

      {isBuyer && <WalletRewards name={name} memberships={memberships} />}

      <div className="grid items-start gap-10 xl:grid-cols-2">
        <div className="flex flex-col gap-8">
          <Group title="Contact" note="Your email is your account, so it can be changed but not removed. Your number is optional." delay={0.05}>
            <Accordion variant="card" type="single" collapsible value={openId ?? ""} onValueChange={(v) => setOpenId(v || null)}>
              <EditRow id="email" label="Email" value={email}
                editor={<VerifiedEditor kind="email" current={email} onCancel={() => setOpenId(null)} onSave={(v) => { setEmail(v); done("Email confirmed and saved"); }} />} />
              <EditRow id="phone" label="Mobile number" value={phoneShown}
                editor={<VerifiedEditor kind="phone" current={phone ?? ""} onCancel={() => setOpenId(null)} onSave={(v) => { setPhone(v); done("Number confirmed and saved"); }} onRemove={() => { setPhone(undefined); done("Mobile number removed"); }} />} />
            </Accordion>
          </Group>
          <Group title="Payment and shipping" note="Only needed for paid orders and merch. Remove them any time." delay={0.08}>
            <Accordion variant="card" type="single" collapsible value={openId ?? ""} onValueChange={(v) => setOpenId(v || null)}>
              <EditRow id="card" label="Card on file" value={card ? `${card.brand} ···${card.last4} · exp ${card.exp}` : "No card saved"}
                editor={<CardEditor card={card} onCancel={() => setOpenId(null)} onSave={(c) => { setCard(c); done("Card saved"); }} onRemove={() => { setCard(null); done("Card removed"); }} />} />
              <EditRow id="billing" label="Billing address" value={billing ? fmtAddress(billing) : "Add an address"}
                editor={<AddressEditor address={billing} onCancel={() => setOpenId(null)} onSave={(a) => { if (a !== "same") setBilling(a); done("Billing address saved"); }}
                  onRemove={() => { setBilling(null); setMailing((m) => (m === "same" ? null : m)); done("Billing address removed"); }} />} />
              <EditRow id="mailing" label="Shipping address" value={mailing === "same" ? "Same as billing" : mailing ? fmtAddress(mailing) : "For merch orders"}
                editor={<AddressEditor address={mailing && mailing !== "same" ? mailing : null} sameAs={{ label: "Same as billing address", on: mailing === "same" }} onCancel={() => setOpenId(null)} onSave={(a) => { setMailing(a); done("Shipping address saved"); }} onRemove={() => { setMailing(null); done("Shipping address removed"); }} />} />
            </Accordion>
          </Group>
        </div>
        <div className="flex flex-col gap-8">
          <Group title="Sign-in" note="We email you a code each time you sign in." delay={0.12}>
            <Row label="Passkey" hint={passkey ? "Open your wallet with Face ID, Touch ID or your device PIN." : "Skip the code on this device."} last
              end={<Button variant="secondary" size="sm" onClick={() => { setPasskey(!passkey); demoLog("profile-passkey", { on: !passkey }); toast(passkey ? "Passkey removed from this device" : "Passkey set up on this device"); }}>{passkey ? "Remove" : "Set up"}</Button>} />
          </Group>
          <Group title="Notifications" note="Receipts and ticket transfers are always emailed." delay={0.15}>
            <Row label="Event reminders by email" hint="24 hours before doors"
              end={<Switch aria-label="Event reminders by email" checked={prefs.remindEmail} onCheckedChange={(v) => setPrefs((p) => ({ ...p, remindEmail: v }))} />} />
            <Row label="Event reminders by text" hint={phone ? "24 hours before doors" : "Add a mobile number to get texts"} last={false}
              end={<Switch aria-label="Event reminders by text" disabled={!phone} checked={!!phone && prefs.remindText} onCheckedChange={(v) => setPrefs((p) => ({ ...p, remindText: v }))} />} />
            <Row label="Marketing emails" hint="Presales and new on-sales near you" last={memberships.length === 0}
              end={<Switch aria-label="Marketing emails" checked={prefs.marketing} onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))} />} />
            {memberships.map((m, i, a) => (
              <Row key={m.id} label={`${m.club} news`} hint="Seat moves, parking and member offers" last={i === a.length - 1}
                end={<Switch aria-label={`${m.club} news`} checked={!clubOff.includes(m.id)} onCheckedChange={(v) => setClubOff((o) => (v ? o.filter((x) => x !== m.id) : [...o, m.id]))} />} />
            ))}
          </Group>
        </div>
      </div>

      {/* Log out the way the big apps do it: who you are signed in as under it, and one confirmation sheet so a slip of the thumb costs nothing. It is a quiet
          grey button with the sign-out icon (Browse events above it is the lighter one); red is kept for the confirmation. Phone only: the avatar menu does this on a computer. */}
      <section aria-label="Sign out" className="flex flex-col items-center gap-1 pb-2 md:hidden">
        <Button variant="ghost" onClick={() => setLeaving(true)}><SignOut weight="bold" /> Log out</Button>
        <p className="text-[14px] text-ink2">Signed in as {email}</p>
      </section>

      {/* Deleting the account is the one thing nobody should find by accident: it is last, well apart from Log out, and closed. Open it and it reads as it
          always did (what it does, and the button); the sheet that button opens asks for a typed word and a hold. */}
      {isBuyer && (
        <Group title="Account" note="Close your account and everything in it." delay={0.18} bare>
          <Accordion variant="card" type="single" collapsible value={openId ?? ""} onValueChange={(v) => setOpenId(v || null)}>
            <EditRow id="delete" label="Delete account"
              editor={
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <p className="max-w-[52ch] text-[14px] leading-snug text-ink2">Permanently remove your wallet, memberships and saved details.</p>
                  <Button variant="danger-soft" onClick={() => { setConfirm(""); setDeleting(true); }}>Delete account…</Button>
                </div>
              } />
          </Accordion>
        </Group>
      )}

      <ResponsiveDialog open={leaving} onOpenChange={setLeaving} title="Log out of Blocktickets?" description="You’ll need a new code to get back in. Your tickets stay in your wallet." footerInline
        footer={<>
          <Button variant="tertiary" onClick={() => setLeaving(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { demoLog("profile-logout", { email }); window.location.assign("/login"); }}>Log out</Button>
        </>} />

      <ResponsiveDialog open={deleting} onOpenChange={setDeleting} title="Delete your account?"
        description={<span className="text-foreground">This can’t be undone once it’s final. Here’s what happens:</span>}
        footer={<>
          <Button variant="tertiary" onClick={() => setDeleting(false)}>Cancel</Button>
          <HoldButton variant="danger" disabled={confirm.trim().toUpperCase() !== "DELETE"} duration={2000} holdLabel="Keep holding…"
            onHoldComplete={() => { setDeleting(false); demoLog("profile-delete", { email }); toast("Check your email to confirm. Your account is removed in 14 days unless you sign in before then."); }}>Hold to delete account</HoldButton>
        </>}>
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[15px] leading-snug text-foreground marker:text-foreground">
          <li>Upcoming tickets can’t be used once your account is gone. Transfer or sell them first.</li>
          {memberships.length > 0 && <li>Your {memberships.map((m) => m.club).join(" and ")} {memberships.length === 1 ? "membership and its" : "memberships and their"} points are lost.</li>}
          <li>Your card, addresses and order history are erased, except records we must keep for tax and fraud.</li>
          <li>Any money owed to you is paid out to your card first.</li>
        </ul>
        <Field className="mt-3">
          <FieldLabel htmlFor="del-confirm" className="text-foreground">Type DELETE to confirm, then hold the button</FieldLabel>
          <Input id="del-confirm" size="lg" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </ResponsiveDialog>
    </div>
  );
}
