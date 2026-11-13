"use client";

import { useState } from "react";
import SmsOptIn from "@/components/molecules/SmsOptIn";
import { updateSmsOptIn } from "@/lib/api";
import { getSession, setSession, type AuthSession } from "@/lib/auth";

export default function ProfileSmsPreference() {
  const [checked, setChecked] = useState(() =>
    Boolean(getSession()?.user.smsOptIn),
  );
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async (next: boolean) => {
    const previous = checked;
    setChecked(next);
    setSaving(true);
    setUpdated(false);
    setFailed(false);
    try {
      const res = await updateSmsOptIn({ data: { smsOptIn: next } });
      const session = res.data as AuthSession;
      if (session?.jwt && session.user) setSession(session);
      setUpdated(true);
    } catch {
      setChecked(previous);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid rgba(5,27,53,0.10)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          margin: 0,
          padding: "14px 18px",
          borderBottom: "1px solid rgba(5,27,53,0.06)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8a93a3",
        }}
      >
        Text messages
      </h2>
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {updated ? (
          <p style={{ margin: 0, fontSize: 14, color: "#2f8f4e" }}>
            Your text message preference has been updated.
          </p>
        ) : null}
        {failed ? (
          <p style={{ margin: 0, fontSize: 14, color: "#c2394a" }}>
            Your text message preference could not be saved. Try again.
          </p>
        ) : null}
        <SmsOptIn
          id="settings-sms-opt-in"
          checked={checked}
          disabled={saving}
          onChange={(next) => void save(next)}
        />
      </div>
    </section>
  );
}
