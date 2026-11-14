"use client";

import { Suspense } from "react";
import PublicSurveyClient from "@/components/organisms/PublicSurvey/PublicSurveyClient";

export default function PublicSurveyPage() {
  return (
    <Suspense fallback={<p className="survey-screen">Loading survey…</p>}>
      <PublicSurveyClient />
    </Suspense>
  );
}
