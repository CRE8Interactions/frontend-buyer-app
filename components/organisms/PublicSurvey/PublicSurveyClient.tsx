"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  getPublicSurvey,
  startPublicSurvey,
  submitPublicSurvey,
} from "@/lib/api";
import { isLoggedIn, setLastKnown } from "@/lib/auth";
import { holdDocumentTitle, surveyTabTitle } from "@/lib/seo";
import {
  validateAnswers,
  visibleQuestions,
  type SurveyAnswer,
} from "@/lib/surveyAnswers";
import SurveyForm, { type PublicSurvey } from "./SurveyForm";

function isSignInRequired(error: unknown) {
  const response = (error as {
    response?: { status?: number; data?: { error?: { code?: string } } };
  })?.response;
  return (
    response?.status === 401 &&
    response?.data?.error?.code === "SIGN_IN_REQUIRED"
  );
}

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message || fallback
  );
}

function needsSignIn(payload: PublicSurvey) {
  return payload?.responseMode === "identified" && !isLoggedIn();
}

function storageKey(token: string) {
  return `blocktickets-survey:${token}`;
}

function schemaFor(survey: PublicSurvey | null) {
  return {
    questions: survey?.questions || [],
    logic: survey?.logic || [],
  };
}

function withoutHiddenAnswers(
  survey: PublicSurvey | null,
  answers: Record<string, SurveyAnswer>,
) {
  const visibleIds = new Set(
    visibleQuestions(schemaFor(survey), answers).map(
      (question) => question.uuid,
    ),
  );
  return Object.fromEntries(
    Object.entries(answers).filter(([questionUuid]) =>
      visibleIds.has(questionUuid),
    ),
  );
}

export default function PublicSurveyClient() {
  const params = useParams<{ token: string }>();
  const token = String(params.token || "");
  const pathname = usePathname() || `/s/${token}`;
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [state, setState] = useState("loading");
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(
    () => holdDocumentTitle(surveyTabTitle(survey?.branding?.orgName)),
    [survey?.branding?.orgName],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const idempotencyKey =
      window.sessionStorage.getItem(storageKey(token)) ||
      window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey(token), idempotencyKey);

    async function load() {
      try {
        const response = await getPublicSurvey(token, idempotencyKey);
        if (cancelled) return;
        const payload = response.data as PublicSurvey;
        setSurvey(payload);
        if (
          payload.state === "sign_in_required" ||
          (payload.state === "open" && needsSignIn(payload))
        ) {
          setState("sign_in_required");
          return;
        }
        if (payload.state !== "open") {
          setState(payload.state || "unavailable");
          return;
        }
        await startPublicSurvey(token, { idempotencyKey });
        if (!cancelled) setState("open");
      } catch (error) {
        if (!cancelled) {
          if (isSignInRequired(error)) {
            setMessage(errorMessage(error, "Sign in to take this survey."));
            setState("sign_in_required");
            return;
          }
          setState("unavailable");
          setMessage(errorMessage(error, "This survey is unavailable."));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit() {
    const schema = schemaFor(survey);
    const currentAnswers = withoutHiddenAnswers(survey, answers);
    const result = validateAnswers(schema, currentAnswers);
    if (!result.ok) {
      const next: Record<string, string> = {};
      result.issues.forEach((issue) => {
        next[issue.questionUuid] = issue.message;
      });
      setErrors(next);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await submitPublicSurvey(token, {
        answers: result.answers,
        idempotencyKey: window.sessionStorage.getItem(storageKey(token)),
        recipientToken: new URLSearchParams(window.location.search).get("r"),
      });
      setState("completed");
    } catch (error) {
      const issues = (
        error as {
          response?: {
            status?: number;
            data?: { error?: { details?: { questionUuid: string; message: string }[] } };
          };
        }
      )?.response;
      const details = issues?.data?.error?.details;
      if (Array.isArray(details)) {
        const next: Record<string, string> = {};
        details.forEach((issue) => {
          next[issue.questionUuid] = issue.message;
        });
        setErrors(next);
      } else if (isSignInRequired(error)) {
        setMessage(errorMessage(error, "Sign in to take this survey."));
        setState("sign_in_required");
      } else if (issues?.status === 409) {
        setState("already_completed");
      } else {
        setMessage(errorMessage(error, "The survey could not be submitted."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  let content;
  if (state === "loading") {
    content = <p className="survey-screen">Loading survey…</p>;
  } else if (state === "completed") {
    content = (
      <section className="survey-screen">
        <h1>Thank you</h1>
        <p>{survey?.completionMessage || "Your response has been recorded."}</p>
      </section>
    );
  } else if (state !== "open") {
    const copy: Record<string, string> = {
      scheduled: "This survey is not open yet.",
      expired: "This survey has expired.",
      closed: "This survey is closed.",
      already_completed: "You already completed this survey.",
      sign_in_required: message || "Sign in to take this survey.",
      unavailable: message || "This survey is unavailable.",
    };
    const branding = survey?.branding || {};
    const returnTo = `${pathname}${search}`;
    content = (
      <section
        className="survey-screen"
        style={
          {
            "--survey-color":
              branding.buttonColor || branding.primaryColor || "#1f7a8c",
          } as CSSProperties
        }
      >
        <h1>{survey?.title || "Survey"}</h1>
        <p>{copy[state] || copy.unavailable}</p>
        {state === "sign_in_required" && (
          <Link
            className="public-survey__submit survey-screen__action"
            href={`/login/?from=${encodeURIComponent(returnTo)}`}
            onClick={() => setLastKnown(returnTo)}
          >
            Sign in
          </Link>
        )}
      </section>
    );
  } else {
    content = (
      <SurveyForm
        survey={survey || {}}
        answers={answers}
        errors={errors}
        submitting={submitting}
        onChange={(questionUuid, value) =>
          setAnswers((current) =>
            withoutHiddenAnswers(survey, {
              ...current,
              [questionUuid]: value,
            }),
          )
        }
        onSubmit={submit}
      />
    );
  }

  return <div className="public-survey-page">{content}</div>;
}
