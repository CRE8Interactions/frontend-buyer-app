"use client";

import { Suspense } from "react";
import SurveyUnsubscribeClient from "@/components/organisms/PublicSurvey/SurveyUnsubscribeClient";

export default function SurveyUnsubscribePage() {
  return (
    <Suspense fallback={<p className="survey-screen">Updating your preferences…</p>}>
      <SurveyUnsubscribeClient />
    </Suspense>
  );
}
