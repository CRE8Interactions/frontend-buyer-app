import { describe, expect, it } from "vitest";
import { validateAnswers, visibleQuestions } from "@/lib/surveyAnswers";

const schema = {
  questions: [
    {
      uuid: "return",
      type: "yes_no",
      title: "Would you attend again?",
      required: true,
    },
    {
      uuid: "why",
      type: "long_text",
      title: "What would make you reconsider?",
      required: true,
    },
    {
      uuid: "picks",
      type: "multi_select",
      title: "Which areas did you visit?",
      required: true,
      configuration: {
        minSelections: 1,
        maxSelections: 2,
        options: [
          { id: "concessions", label: "Concessions" },
          { id: "merch", label: "Merch" },
          { id: "club", label: "Club" },
        ],
      },
    },
  ],
  logic: [
    {
      sourceQuestionUuid: "return",
      operator: "equals",
      comparisonValue: "no",
      targetQuestionUuid: "why",
      action: "show",
    },
  ],
};

describe("survey answers", () => {
  it("hides the follow-up until the answer is no, then requires it", () => {
    expect(
      visibleQuestions(schema, { return: { value: "yes" } }).map(
        (question) => question.uuid,
      ),
    ).not.toContain("why");
    expect(
      visibleQuestions(schema, { return: { value: "no" } }).map(
        (question) => question.uuid,
      ),
    ).toContain("why");

    const required = validateAnswers(schema, {
      return: { value: "no" },
      picks: { optionIds: ["merch"] },
    });
    expect(required.issues.some((issue) => issue.questionUuid === "why")).toBe(
      true,
    );
  });

  it("drops an answer that is no longer visible and rejects an unknown question", () => {
    const hidden = validateAnswers(schema, {
      return: { value: "yes" },
      why: { text: "Parking" },
      picks: { optionIds: ["merch"] },
    });
    expect(hidden.ok).toBe(true);
    expect(hidden.answers.why).toBeUndefined();
    expect(hidden.issues.some((issue) => issue.questionUuid === "why")).toBe(
      false,
    );

    const unknown = validateAnswers(schema, {
      return: { value: "yes" },
      picks: { optionIds: ["merch"] },
      retired: { text: "old" },
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.issues).toEqual([
      {
        questionUuid: "retired",
        message: "This question is not part of the published survey",
      },
    ]);
  });
});
