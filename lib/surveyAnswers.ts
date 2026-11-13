export type SurveyAnswer = {
  optionId?: string;
  optionIds?: string[];
  otherText?: string;
  text?: string;
  value?: string | number;
  query?: string;
};

export type SurveyOption = {
  id?: string;
  label?: string;
  exclusive?: boolean;
};

export type SurveyQuestion = {
  uuid: string;
  type: string;
  title?: string;
  required?: boolean;
  enabled?: boolean;
  helpText?: string;
  heading?: string;
  section?: { id?: string; title?: string };
  configuration?: {
    options?: SurveyOption[];
    allowOther?: boolean;
    otherLabel?: string;
    minSelections?: number;
    maxSelections?: number;
    maxLength?: number;
    validation?: string;
    scale?: number;
    labels?: string[];
    notApplicable?: boolean;
    leftLabel?: string;
    rightLabel?: string;
    knownAnswer?: string;
    mode?: string;
    searchable?: boolean;
    yesLabel?: string;
    noLabel?: string;
  };
};

export type SurveyLogicRule = {
  sourceQuestionUuid?: string;
  targetQuestionUuid?: string;
  operator?: string;
  comparisonValue?: string | number;
  action?: string;
};

export type SurveySchema = {
  questions?: SurveyQuestion[];
  logic?: SurveyLogicRule[];
};

export type SurveyIssue = {
  questionUuid: string;
  message: string;
};

type AnswerMap = Record<string, SurveyAnswer | undefined>;

function asRecord(value: unknown): SurveyAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SurveyAnswer;
}

function configurationOf(question: SurveyQuestion) {
  return question.configuration || {};
}

export function sanitizeFreeText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

function optionIds(question: SurveyQuestion) {
  const options = configurationOf(question).options;
  const ids = Array.isArray(options)
    ? options.map((option) => String((option && option.id) || ""))
    : [];
  if (configurationOf(question).allowOther) ids.push("other");
  return ids;
}

export function isAnswerEmpty(question: SurveyQuestion, raw: unknown) {
  const answer = asRecord(raw);
  switch (question.type) {
    case "single_select":
    case "dropdown":
      return !answer.optionId;
    case "multi_select":
      return !Array.isArray(answer.optionIds) || answer.optionIds.length === 0;
    case "short_text":
    case "long_text":
      return !sanitizeFreeText(answer.text, 10000);
    case "date_time":
      return !sanitizeFreeText(answer.value, 40);
    default:
      return answer.value == null || answer.value === "";
  }
}

function comparable(question: SurveyQuestion, raw: unknown) {
  const answer = asRecord(raw);
  if (question.type === "multi_select") return answer.optionIds || [];
  if (question.type === "single_select" || question.type === "dropdown") {
    return answer.optionId || null;
  }
  if (question.type === "short_text" || question.type === "long_text") {
    return answer.text || "";
  }
  return answer.value;
}

function matchesRule(
  question: SurveyQuestion,
  raw: unknown,
  operator: string | undefined,
  expected: string | number | undefined,
) {
  const value = comparable(question, raw);
  if (operator === "includes") {
    return Array.isArray(value) && value.map(String).includes(String(expected));
  }
  if (
    operator === "lt" ||
    operator === "lte" ||
    operator === "gt" ||
    operator === "gte"
  ) {
    const left = Number(value);
    const right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (operator === "lt") return left < right;
    if (operator === "lte") return left <= right;
    if (operator === "gt") return left > right;
    return left >= right;
  }
  const same = String(value ?? "") === String(expected);
  return operator === "not_equals" ? !same : same;
}

function isEnabled(question: SurveyQuestion) {
  return question.enabled !== false;
}

function logicSourceReady(question: SurveyQuestion, visible: Set<string>) {
  if (visible.has(question.uuid)) return true;
  return Boolean(question.configuration && question.configuration.knownAnswer);
}

function questionsOf(schema: SurveySchema) {
  return Array.isArray(schema?.questions) ? schema.questions : [];
}

function logicOf(schema: SurveySchema) {
  return Array.isArray(schema?.logic) ? schema.logic : [];
}

function effectiveAnswers(schema: SurveySchema, rawAnswers: unknown): AnswerMap {
  const answers: AnswerMap =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? { ...(rawAnswers as AnswerMap) }
      : {};
  questionsOf(schema).forEach((question) => {
    const known = question.configuration && question.configuration.knownAnswer;
    if (!known || !isAnswerEmpty(question, answers[question.uuid])) return;
    answers[question.uuid] = { optionId: String(known) };
  });
  return answers;
}

export function visibleQuestions(schema: SurveySchema, rawAnswers: unknown) {
  const answers = effectiveAnswers(schema, rawAnswers);
  const questions = questionsOf(schema);
  const logic = logicOf(schema);
  const showTargets = new Set(
    logic
      .filter((rule) => rule.action === "show")
      .map((rule) => rule.targetQuestionUuid),
  );
  const visible = new Set(
    questions
      .filter(
        (question) => isEnabled(question) && !showTargets.has(question.uuid),
      )
      .map((question) => question.uuid),
  );
  logic.forEach((rule) => {
    const source = questions.find(
      (question) => question.uuid === rule.sourceQuestionUuid,
    );
    if (!source || !logicSourceReady(source, visible)) return;
    const matched = matchesRule(
      source,
      answers[source.uuid],
      rule.operator,
      rule.comparisonValue,
    );
    if (rule.action === "show" && matched && rule.targetQuestionUuid) {
      visible.add(rule.targetQuestionUuid);
    }
  });
  logic.forEach((rule) => {
    const source = questions.find(
      (question) => question.uuid === rule.sourceQuestionUuid,
    );
    if (!source || !logicSourceReady(source, visible)) return;
    const matched = matchesRule(
      source,
      answers[source.uuid],
      rule.operator,
      rule.comparisonValue,
    );
    if (rule.action === "hide" && matched && rule.targetQuestionUuid) {
      visible.delete(rule.targetQuestionUuid);
    }
  });
  return questions.filter(
    (question) => isEnabled(question) && visible.has(question.uuid),
  );
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanAnswer(
  question: SurveyQuestion,
  raw: unknown,
  issues: SurveyIssue[],
): SurveyAnswer | null {
  const answer = asRecord(raw);
  const configuration = configurationOf(question);
  if (question.type === "single_select" || question.type === "dropdown") {
    const optionId = String(answer.optionId || "");
    if (!optionIds(question).includes(optionId)) {
      issues.push({
        questionUuid: question.uuid,
        message: "Choose one of the listed options",
      });
      return null;
    }
    const cleaned: SurveyAnswer = { optionId };
    if (optionId === "other") {
      cleaned.otherText = sanitizeFreeText(answer.otherText, 500);
    }
    return cleaned;
  }
  if (question.type === "multi_select") {
    const allowed = new Set(optionIds(question));
    const selected = Array.isArray(answer.optionIds)
      ? answer.optionIds.map(String).filter((id) => allowed.has(id))
      : [];
    const min = Number(configuration.minSelections || 0);
    const max = Number(configuration.maxSelections || selected.length);
    if (selected.length < min || selected.length > max) {
      issues.push({
        questionUuid: question.uuid,
        message: `Select between ${min} and ${max} options`,
      });
      return null;
    }
    const exclusive = new Set(
      (Array.isArray(configuration.options) ? configuration.options : [])
        .filter((option) => option && option.exclusive)
        .map((option) => String(option.id)),
    );
    if (selected.some((id) => exclusive.has(id)) && selected.length > 1) {
      issues.push({
        questionUuid: question.uuid,
        message: "That choice cannot be combined with other options",
      });
      return null;
    }
    const cleaned: SurveyAnswer = { optionIds: selected };
    if (selected.includes("other")) {
      cleaned.otherText = sanitizeFreeText(answer.otherText, 500);
    }
    return cleaned;
  }
  if (question.type === "short_text" || question.type === "long_text") {
    const max = Number(
      configuration.maxLength || (question.type === "short_text" ? 200 : 2000),
    );
    const text = sanitizeFreeText(answer.text, max);
    const validation = String(configuration.validation || "none");
    if (
      question.type === "short_text" &&
      validation === "email" &&
      !emailOk(text)
    ) {
      issues.push({
        questionUuid: question.uuid,
        message: "Enter a valid email address",
      });
    }
    if (
      question.type === "short_text" &&
      validation === "number" &&
      !/^-?\d+(\.\d+)?$/.test(text)
    ) {
      issues.push({ questionUuid: question.uuid, message: "Enter a number" });
    }
    if (
      question.type === "short_text" &&
      validation === "phone" &&
      !/^[0-9+().\-\s]{7,20}$/.test(text)
    ) {
      issues.push({
        questionUuid: question.uuid,
        message: "Enter a valid phone number",
      });
    }
    return { text };
  }
  if (question.type === "star_rating") {
    if (
      configuration.notApplicable &&
      (answer.value === "na" || answer.value === "n/a")
    ) {
      return { value: "na" };
    }
    const scale = Number(configuration.scale || 5);
    const value = Number(answer.value);
    if (!Number.isInteger(value) || value < 1 || value > scale) {
      issues.push({
        questionUuid: question.uuid,
        message: `Choose a rating from 1 to ${scale}`,
      });
      return null;
    }
    return { value };
  }
  if (question.type === "nps") {
    const value = Number(answer.value);
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      issues.push({
        questionUuid: question.uuid,
        message: "Choose a score from 0 to 10",
      });
      return null;
    }
    return { value };
  }
  if (question.type === "satisfaction") {
    const value = Number(answer.value);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      issues.push({
        questionUuid: question.uuid,
        message: "Choose a satisfaction level",
      });
      return null;
    }
    return { value };
  }
  if (question.type === "yes_no") {
    const value =
      answer.value === "no" ? "no" : answer.value === "yes" ? "yes" : "";
    if (!value) {
      issues.push({ questionUuid: question.uuid, message: "Choose yes or no" });
      return null;
    }
    return { value };
  }
  const mode = String(configuration.mode || "date");
  const value = sanitizeFreeText(answer.value, 40);
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timeOk = /^\d{2}:\d{2}$/.test(value);
  const bothOk = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
  const valid =
    (mode === "date" && dateOk) ||
    (mode === "time" && timeOk) ||
    (mode === "datetime" && bothOk);
  if (!valid) {
    issues.push({
      questionUuid: question.uuid,
      message: "Enter a valid date or time",
    });
    return null;
  }
  return { value };
}

export function validateAnswers(schema: SurveySchema, rawAnswers: unknown) {
  const provided: AnswerMap =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as AnswerMap)
      : {};
  const answers = effectiveAnswers(schema, provided);
  const visible = visibleQuestions(schema, answers);
  const visibleIds = new Set(visible.map((question) => question.uuid));
  const questions = questionsOf(schema);
  const issues: SurveyIssue[] = [];
  Object.keys(provided).forEach((questionUuid) => {
    if (visibleIds.has(questionUuid)) return;
    const question = questions.find((item) => item.uuid === questionUuid);
    // Show/hide can leave an earlier answer in the form. Drop it instead of
    // failing the submission. Unknown and disabled questions still fail.
    if (question && isEnabled(question)) return;
    issues.push({
      questionUuid,
      message: "This question is not part of the published survey",
    });
  });

  const cleaned: AnswerMap = {};
  visible.forEach((question) => {
    const raw = answers[question.uuid];
    if (isAnswerEmpty(question, raw)) {
      if (question.required) {
        issues.push({
          questionUuid: question.uuid,
          message: "This question is required",
        });
      }
      return;
    }
    const next = cleanAnswer(question, raw, issues);
    if (next) cleaned[question.uuid] = next;
  });

  questions.forEach((question) => {
    const known = question.configuration && question.configuration.knownAnswer;
    if (isEnabled(question) || !known || cleaned[question.uuid]) return;
    const next = cleanAnswer(question, answers[question.uuid], issues);
    if (next) cleaned[question.uuid] = next;
  });

  return { ok: issues.length === 0, issues, answers: cleaned, visible };
}
