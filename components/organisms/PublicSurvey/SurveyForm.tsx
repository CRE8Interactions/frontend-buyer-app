"use client";

import type { CSSProperties, FormEvent } from "react";
import {
  visibleQuestions,
  type SurveyAnswer,
  type SurveyQuestion,
} from "@/lib/surveyAnswers";

const SATISFACTION = ["😠", "🙁", "😐", "🙂", "😄"];

export type PublicSurvey = {
  title?: string;
  description?: string;
  completionMessage?: string;
  state?: string;
  responseMode?: string;
  questions?: SurveyQuestion[];
  logic?: {
    sourceQuestionUuid?: string;
    targetQuestionUuid?: string;
    operator?: string;
    comparisonValue?: string | number;
    action?: string;
  }[];
  branding?: {
    buttonColor?: string;
    primaryColor?: string;
    logoUrl?: string;
    orgName?: string;
  };
};

function ChoiceField({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: SurveyAnswer;
  onChange: (next: SurveyAnswer) => void;
}) {
  const selected =
    question.type === "multi_select" ? value.optionIds || [] : value.optionId;
  const options = question.configuration?.options || [];
  const otherLabel = question.configuration?.otherLabel || "Other";
  const exclusiveIds = new Set(
    options.filter((option) => option.exclusive).map((option) => option.id),
  );
  const toggle = (id: string) => {
    if (question.type !== "multi_select") {
      onChange({
        optionId: id,
        otherText: id === "other" ? value.otherText || "" : undefined,
      });
      return;
    }
    const current = Array.isArray(selected) ? selected : [];
    if (exclusiveIds.has(id)) {
      onChange({ optionIds: current.includes(id) ? [] : [id] });
      return;
    }
    const withoutExclusive = current.filter((item) => !exclusiveIds.has(item));
    const next = withoutExclusive.includes(id)
      ? withoutExclusive.filter((item) => item !== id)
      : [...withoutExclusive, id];
    const max = Number(question.configuration?.maxSelections);
    if (Number.isInteger(max) && max >= 1 && next.length > max) return;
    onChange({ optionIds: next, otherText: value.otherText });
  };
  const rows = [
    ...options,
    ...(question.configuration?.allowOther
      ? [{ id: "other", label: otherLabel }]
      : []),
  ];
  return (
    <div className="survey-choices">
      {rows.map((option) => {
        const id = String(option.id);
        const checked =
          question.type === "multi_select"
            ? Array.isArray(selected) && selected.includes(id)
            : selected === id;
        return (
          <label key={id} className={checked ? "is-selected" : ""}>
            <input
              type={question.type === "multi_select" ? "checkbox" : "radio"}
              name={question.uuid}
              checked={checked}
              onChange={() => toggle(id)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
      {((question.type === "multi_select" &&
        Array.isArray(selected) &&
        selected.includes("other")) ||
        selected === "other") && (
        <input
          className="survey-other"
          value={value.otherText || ""}
          placeholder="Please specify"
          onChange={(event) =>
            onChange(
              question.type === "multi_select"
                ? {
                    optionIds: Array.isArray(selected) ? selected : [],
                    otherText: event.target.value,
                  }
                : { optionId: "other", otherText: event.target.value },
            )
          }
        />
      )}
    </div>
  );
}

function ScaleField({
  question,
  value,
  onChange,
  name,
}: {
  question: SurveyQuestion;
  value: SurveyAnswer;
  onChange: (next: SurveyAnswer) => void;
  name: string;
}) {
  const max =
    question.type === "nps" ? 10 : Number(question.configuration?.scale || 5);
  const min = question.type === "nps" ? 0 : 1;
  const labels = question.configuration?.labels || [];
  const variant =
    question.type === "star_rating"
      ? "survey-stars"
      : `survey-scale survey-scale--${question.type}`;
  return (
    <div className="survey-scale-field">
      <div className={variant} role="radiogroup">
        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(
          (score) => (
            <label
              key={score}
              className={Number(value.value) === score ? "is-selected" : ""}
            >
              <input
                type="radio"
                name={name}
                checked={Number(value.value) === score}
                onChange={() => onChange({ value: score })}
              />
              <span>
                {question.type === "satisfaction"
                  ? SATISFACTION[score - 1]
                  : score}
                {question.type === "star_rating" ? "★" : ""}
              </span>
              {labels[score - 1] && <small>{labels[score - 1]}</small>}
            </label>
          ),
        )}
        {question.type === "star_rating" &&
          question.configuration?.notApplicable && (
            <label
              className={
                value.value === "na"
                  ? "is-selected survey-stars__na"
                  : "survey-stars__na"
              }
            >
              <input
                type="radio"
                name={name}
                checked={value.value === "na"}
                onChange={() => onChange({ value: "na" })}
              />
              <span>Not applicable</span>
            </label>
          )}
      </div>
      {question.type === "nps" && (
        <div className="survey-scale__ends">
          <span>{question.configuration?.leftLabel || "Not likely"}</span>
          <span>
            {question.configuration?.rightLabel || "Extremely likely"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function SurveyForm({
  survey,
  answers,
  errors,
  onChange,
  onSubmit,
  submitting,
}: {
  survey: PublicSurvey;
  answers: Record<string, SurveyAnswer>;
  errors: Record<string, string>;
  onChange: (questionUuid: string, value: SurveyAnswer) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const schema = {
    questions: survey.questions || [],
    logic: survey.logic || [],
  };
  const visible = visibleQuestions(schema, answers);
  const branding = survey.branding || {};
  const blocks: Array<{
    question: (typeof visible)[number];
    showSection: boolean;
    showHeading: boolean;
  }> = [];
  let previousSection = "";
  let previousHeading = "";
  for (const question of visible) {
    const sectionId = question.section?.id || "";
    const heading = question.heading || "";
    const showSection = Boolean(sectionId && sectionId !== previousSection);
    const showHeading = Boolean(heading && heading !== previousHeading);
    previousSection = sectionId || previousSection;
    previousHeading = heading;
    blocks.push({ question, showSection, showHeading });
  }
  const color =
    branding.buttonColor || branding.primaryColor || "#1f7a8c";

  return (
    <form
      className="public-survey"
      style={{ "--survey-color": color } as CSSProperties}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <header className="public-survey__intro">
        {branding.logoUrl && (
          <img
            className="public-survey__logo"
            src={branding.logoUrl}
            alt={branding.orgName ? "" : "Organization logo"}
          />
        )}
        {branding.orgName && (
          <p className="public-survey__org">{branding.orgName}</p>
        )}
        <h1>{survey.title}</h1>
        {survey.description && (
          <p className="public-survey__description">{survey.description}</p>
        )}
      </header>
      {blocks.map(({ question, showSection, showHeading }) => {
        const stored = answers[question.uuid] || {};
        const value =
          (question.type === "single_select" || question.type === "dropdown") &&
          !stored.optionId &&
          question.configuration?.knownAnswer
            ? { ...stored, optionId: question.configuration.knownAnswer }
            : stored;
        const error = errors[question.uuid];
        return (
          <div key={question.uuid}>
            {showSection && (
              <h2 className="public-survey__section">
                {question.section?.title}
              </h2>
            )}
            {showHeading && (
              <h3 className="public-survey__heading">{question.heading}</h3>
            )}
            <fieldset
              className={error ? "has-error" : ""}
              aria-invalid={Boolean(error)}
            >
              <legend>
                {question.title}
                {question.required && <span aria-hidden="true"> *</span>}
              </legend>
              {question.helpText && (
                <p className="survey-help">{question.helpText}</p>
              )}
              {(question.type === "single_select" ||
                question.type === "multi_select") && (
                <ChoiceField
                  question={question}
                  value={value}
                  onChange={(next) => onChange(question.uuid, next)}
                />
              )}
              {question.type === "dropdown" && (
                <>
                  {question.configuration?.searchable && (
                    <input
                      className="survey-other"
                      placeholder="Search options"
                      value={value.query || ""}
                      onChange={(event) =>
                        onChange(question.uuid, {
                          ...value,
                          query: event.target.value,
                        })
                      }
                    />
                  )}
                  <select
                    value={value.optionId || ""}
                    onChange={(event) =>
                      onChange(question.uuid, { optionId: event.target.value })
                    }
                  >
                    <option value="">Select one</option>
                    {(question.configuration?.options || [])
                      .filter((option) =>
                        String(option.label)
                          .toLowerCase()
                          .includes(String(value.query || "").toLowerCase()),
                      )
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </>
              )}
              {question.type === "short_text" && (
                <input
                  maxLength={question.configuration?.maxLength || 200}
                  value={value.text || ""}
                  onChange={(event) =>
                    onChange(question.uuid, { text: event.target.value })
                  }
                />
              )}
              {question.type === "long_text" && (
                <textarea
                  maxLength={question.configuration?.maxLength || 2000}
                  value={value.text || ""}
                  onChange={(event) =>
                    onChange(question.uuid, { text: event.target.value })
                  }
                />
              )}
              {(question.type === "star_rating" ||
                question.type === "nps" ||
                question.type === "satisfaction") && (
                <ScaleField
                  question={question}
                  value={value}
                  name={question.uuid}
                  onChange={(next) => onChange(question.uuid, next)}
                />
              )}
              {question.type === "yes_no" && (
                <div className="survey-choices survey-choices--pair">
                  {["yes", "no"].map((choice) => (
                    <label
                      key={choice}
                      className={value.value === choice ? "is-selected" : ""}
                    >
                      <input
                        type="radio"
                        name={question.uuid}
                        checked={value.value === choice}
                        onChange={() =>
                          onChange(question.uuid, { value: choice })
                        }
                      />
                      <span>
                        {choice === "yes"
                          ? question.configuration?.yesLabel || "Yes"
                          : question.configuration?.noLabel || "No"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {question.type === "date_time" && (
                <input
                  type={
                    question.configuration?.mode === "time"
                      ? "time"
                      : question.configuration?.mode === "datetime"
                        ? "datetime-local"
                        : "date"
                  }
                  value={String(value.value || "")}
                  onChange={(event) =>
                    onChange(question.uuid, { value: event.target.value })
                  }
                />
              )}
              {error && <p className="survey-error">{error}</p>}
            </fieldset>
          </div>
        );
      })}
      <button
        className="public-survey__submit"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
