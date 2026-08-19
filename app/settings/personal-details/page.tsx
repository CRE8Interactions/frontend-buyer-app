"use client";

import { useEffect, useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import BackChip from "@/components/molecules/BackChip";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import { Input, Label } from "@/components/atoms/form";
import Button from "@/components/atoms/Button";
import { updatePersonalDetails } from "@/lib/api";
import { displayName, getSession, setSession, useAuth } from "@/lib/auth";
import { emailPatternMatch, namePatternMatch } from "@/lib/helpers";

export default function PersonalDetailsPage() {
  const { user, ready, refresh } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailOk, setEmailOk] = useState(true);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
  }, [user]);

  const dirty =
    firstName !== (user?.firstName || "") ||
    lastName !== (user?.lastName || "") ||
    email !== (user?.email || "");
  const valid =
    Boolean(firstName && lastName && email) && emailPatternMatch(email);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !dirty) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await updatePersonalDetails({
        data: { firstName, lastName, email },
      });
      const session = getSession();
      if (session && res.data) {
        const nextUser =
          (res.data as { user?: typeof user }).user ||
          (res.data as typeof user);
        setSession({
          ...session,
          user: { ...session.user, ...(nextUser as object) },
        });
        refresh();
      }
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <WalletShell>
        <PageLoader label="Loading" />
      </WalletShell>
    );
  }

  return (
    <WalletShell>
      <BackChip href="/settings/" label="Settings" />
      <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.01em]">Personal details</h2>
      <p className="mt-1 text-[14px] text-[#9DA2B3]">
        Access and change your personal details{user ? ` · ${displayName(user)}` : ""}.
      </p>

      {saved && (
        <div className="mt-4 rounded-xl border border-[#4caf50]/30 bg-[#4caf50]/10 px-4 py-3 text-[14px] text-[#86e29b]">
          Your personal details have been updated.
        </div>
      )}

      <form className={`${cardCls} mt-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-7`} onSubmit={onSubmit}>
        <div className="sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className={`mt-2.5 ${!emailOk ? "border-[#ff7a72]" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={(e) => setEmailOk(emailPatternMatch(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="first">First name</Label>
          <Input
            id="first"
            className="mt-2.5"
            pattern={namePatternMatch}
            value={firstName}
            onChange={(e) => {
              if (e.target.validity.valid || e.target.value === "") setFirstName(e.target.value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="last">Last name</Label>
          <Input
            id="last"
            className="mt-2.5"
            pattern={namePatternMatch}
            value={lastName}
            onChange={(e) => {
              if (e.target.validity.valid || e.target.value === "") setLastName(e.target.value);
            }}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!valid || !dirty || saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Update"}
          </Button>
        </div>
      </form>
    </WalletShell>
  );
}
