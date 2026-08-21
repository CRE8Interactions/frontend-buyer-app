"use client";

import { useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import BackChip from "@/components/molecules/BackChip";
import CodeField, { type CodeError } from "@/components/molecules/CodeField";
import PhoneNumberInput, {
  phoneNumberError,
} from "@/components/molecules/PhoneNumberInput";
import { cardCls } from "@/components/molecules/Card";
import { Label } from "@/components/atoms/form";
import Button from "@/components/atoms/Button";
import {
  phoneUnique,
  requestNumberChange,
  updateNumber,
} from "@/lib/api";
import { getSession, setSession, useAuth } from "@/lib/auth";
import { FIELD_COPY } from "@/lib/fieldValidation";

export default function LoginSecurityPage() {
  const { user, refresh } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [uniqueOk, setUniqueOk] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState<CodeError>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [currentPhone, setCurrentPhone] = useState(user?.phoneNumber || "");

  const formatError = phoneNumberError(phoneNumber);
  const validNumber = !formatError && uniqueOk;

  const checkUnique = async () => {
    setPhoneTouched(true);
    if (!phoneNumber || formatError) return;
    try {
      const res = await phoneUnique({ data: { phoneNumber } });
      setUniqueOk(res.data === 200);
    } catch {
      setUniqueOk(false);
    }
  };

  const requestCode = async () => {
    if (!validNumber || !user?.phoneNumber) return;
    setSaving(true);
    setNetworkError(false);
    try {
      const unique = await phoneUnique({ data: { phoneNumber } });
      if (unique.data !== 200) {
        setUniqueOk(false);
        return;
      }
      await requestNumberChange({
        data: { toNumber: phoneNumber, fromNumber: user.phoneNumber },
      });
      setVerifying(true);
    } catch {
      setNetworkError(true);
    } finally {
      setSaving(false);
    }
  };

  const confirmCode = async (value: string) => {
    setCode(value);
    setCodeError(null);
    if (value.length !== 6) return;
    try {
      const res = await updateNumber({ data: { code: value } });
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
      setCurrentPhone(phoneNumber || "");
      setUpdated(true);
      setVerifying(false);
    } catch {
      setCodeError("code");
    }
  };

  return (
    <WalletShell>
      <BackChip href="/settings/" label="Settings" />
      <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.01em]">Login &amp; security</h2>
      <p className="mt-1 text-[14px] text-[#9DA2B3]">
        Update the phone number associated with this account. Your phone number is required for
        security reasons.
      </p>
      <p className="mt-3 text-[15px] font-semibold">
        Current phone number:{" "}
        <span className="text-[#A6E773]">{currentPhone || user?.phoneNumber || "—"}</span>
      </p>

      {verifying && (
        <div className="mt-4 rounded-xl border border-[#A6E773]/30 bg-[#A6E773]/10 px-4 py-3 text-[14px] text-[#BCBFCC]">
          Enter the 6-digit code sent to your new number to finish updating.
        </div>
      )}
      {updated && (
        <div className="mt-4 rounded-xl border border-[#4caf50]/30 bg-[#4caf50]/10 px-4 py-3 text-[14px] text-[#86e29b]">
          Your phone number has been updated successfully.
        </div>
      )}
      {networkError ? (
        <div className="mt-4 rounded-xl border border-[#ff7a72]/30 bg-[#ff7a72]/10 px-4 py-3 text-[14px] text-[#ff9a93]">
          {FIELD_COPY.network}
        </div>
      ) : null}

      <div className={`${cardCls} mt-6 p-6 sm:p-7`}>
        <div>
          <Label>New phone number</Label>
          <PhoneNumberInput
            variant="dark"
            value={phoneNumber}
            error={
              !uniqueOk
                ? "exists"
                : phoneTouched
                  ? formatError
                  : null
            }
            onChange={(value) => {
              setPhoneNumber(value);
              setUniqueOk(true);
              setPhoneTouched(false);
            }}
            onBlur={() => void checkUnique()}
            disabled={updated}
          />
        </div>

        {!updated && (
          <div className="mt-5">
            <CodeField
              id="code"
              label="Verify code"
              layout="input"
              variant="dark"
              value={code}
              error={codeError}
              onChange={(value) => void confirmCode(value)}
            />
            <p className="mt-2 text-[13px] text-[#9DA2B3]">
              A 6-digit code is sent to the new number after you request an update.
            </p>
          </div>
        )}

        {!verifying && !updated && (
          <Button className="mt-6" disabled={!validNumber || saving} onClick={() => void requestCode()}>
            {saving ? "Sending…" : "Update phone number"}
          </Button>
        )}
      </div>
    </WalletShell>
  );
}
