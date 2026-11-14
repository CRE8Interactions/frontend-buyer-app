"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeSurvey } from "@/lib/api";
import { holdDocumentTitle, unsubscribeTabTitle } from "@/lib/seo";

export default function SurveyUnsubscribeClient() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState(token ? "working" : "invalid");
  const [orgName, setOrgName] = useState("");

  useEffect(
    () => holdDocumentTitle(unsubscribeTabTitle(orgName)),
    [orgName],
  );

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    unsubscribeSurvey(token)
      .then((response) => {
        if (cancelled) return;
        setOrgName(String(response.data?.organizationName || ""));
        setState("done");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const message =
    state === "done"
      ? "You are unsubscribed from survey messages for this organization."
      : state === "error" || state === "invalid"
        ? "This unsubscribe link is not valid."
        : "Updating your preferences…";

  return (
    <main className="public-survey-page">
      <section className="public-survey">
        <h1>Survey messages</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
