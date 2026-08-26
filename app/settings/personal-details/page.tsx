"use client";

import { useEffect, useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import BackChip from "@/components/molecules/BackChip";
import EmailField from "@/components/molecules/EmailField";
import NameField from "@/components/molecules/NameField";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import { updatePersonalDetails } from "@/lib/api";
import { displayName, getSession, setSession, useAuth } from "@/lib/auth";
import {
  FIELD_COPY,
  emailBlurInvalid,
  emailSubmitInvalid,
  formString,
  nameFieldError,
  normalizeEmail,
  submittedEmail,
} from "@/lib/fieldValidation";

export default function PersonalDetailsPage() {
  const { user, ready, refresh } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailOk, setEmailOk] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
  }, [user]);

  const nextEmail = normalizeEmail(email);
  const dirty =
    firstName !== (user?.firstName || "") ||
    lastName !== (user?.lastName || "") ||
    nextEmail !== (user?.email || "");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const address = submittedEmail(data);
    const first = formString(data, "firstName") || firstName;
    const last = formString(data, "lastName") || lastName;
    setEmail(address);
    setFirstName(first);
    setLastName(last);
    if (emailSubmitInvalid(address)) {
      setEmailOk(false);
      return;
    }
    if (nameFieldError(first) || nameFieldError(last)) return;
    const stillDirty =
      first !== (user?.firstName || "") ||
      last !== (user?.lastName || "") ||
      address !== (user?.email || "");
    if (!stillDirty) return;
    setSaving(true);
    setSaved(false);
    setNetworkError(false);
    try {
      const res = await updatePersonalDetails({
        data: { firstName: first, lastName: last, email: address },
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
    } catch {
      setNetworkError(true);
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
      {networkError ? (
        <div className="mt-4 rounded-xl border border-[#ff7a72]/30 bg-[#ff7a72]/10 px-4 py-3 text-[14px] text-[#ff9a93]">
          {FIELD_COPY.network}
        </div>
      ) : null}

      <form
        className={`${cardCls} mt-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-7`}
        noValidate
        onSubmit={onSubmit}
      >
        <EmailField
          id="email"
          name="email"
          label="Email"
          className="sm:col-span-2"
          variant="dark"
          value={email}
          invalid={!emailOk}
          onChange={(value) => {
            setEmail(value);
            setEmailOk(true);
            setNetworkError(false);
          }}
          onBlur={(value) => setEmailOk(!emailBlurInvalid(value))}
        />
        <NameField
          id="first"
          name="firstName"
          label="First name"
          variant="dark"
          autoComplete="given-name"
          value={firstName}
          onChange={setFirstName}
        />
        <NameField
          id="last"
          name="lastName"
          label="Last name"
          variant="dark"
          autoComplete="family-name"
          value={lastName}
          onChange={setLastName}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Update"}
          </Button>
        </div>
      </form>
    </WalletShell>
  );
}
