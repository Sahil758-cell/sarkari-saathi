"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import SelectButtons from "@/components/SelectButtons";
import { useLanguage } from "@/context/LanguageContext";
import { getCategoryOptions, getGenderOptions, getIncomeOptions } from "@/lib/constants";
import { labelFor, RESIDENCY_OPTIONS, stateLabel } from "@/lib/i18n/options";
import type { PartialProfile, QuestionSpec } from "@/lib/types";

interface Props {
  questions: QuestionSpec[];
  onSubmit: (profile: PartialProfile) => void;
  submitting?: boolean;
}

// Renders only the questions a given scheme actually cares about
// (GET /schemes/{slug}/questions) and converts the answers to the partial
// profile shape POST /schemes/{slug}/eligibility expects. Ported from the
// mobile app's DynamicQuestionForm.
export default function DynamicQuestionForm({ questions, onSubmit, submitting }: Props) {
  const { language, t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const yesNo = [
    { value: "yes", label: t("yes") },
    { value: "no", label: t("no") },
  ];
  const incomeWithSkip = [...getIncomeOptions(language), { value: "skip", label: t("skip") }];

  function promptFor(q: QuestionSpec): string {
    switch (q.key) {
      case "age":
        return t("askAge");
      case "gender":
        return t("askGender");
      case "category":
        return t("askCategory");
      case "income_bracket":
        return t("askIncome");
      case "is_bpl":
        return t("askBpl");
      case "is_disabled":
        return t("haveDisability");
      case "state_confirm":
        return t("stateConfirmQ", {
          states: (q.states ?? []).map((s) => stateLabel(s, language)).join(", "),
        });
      case "residency_confirm":
        return t("residencyConfirmQ", {
          residency: labelFor(q.residency, RESIDENCY_OPTIONS, language),
        });
      default:
        return q.key;
    }
  }

  const setAnswer = (key: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const ageRaw = answers.age ?? "";
  const ageOk = Number.isInteger(Number(ageRaw)) && Number(ageRaw) >= 1 && Number(ageRaw) <= 120;
  const allAnswered = questions.every((q) =>
    q.key === "age" ? ageRaw.trim() !== "" && ageOk : answers[q.key] !== undefined
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const profile: PartialProfile = {};
    for (const q of questions) {
      const value = answers[q.key];
      if (value === undefined) continue;
      switch (q.key) {
        case "age":
          profile.age = Number(value);
          break;
        case "gender":
          profile.gender = value as PartialProfile["gender"];
          break;
        case "category":
          profile.category = value as PartialProfile["category"];
          break;
        case "income_bracket":
          profile.income_bracket =
            value === "skip" ? undefined : (value as PartialProfile["income_bracket"]);
          break;
        case "is_bpl":
          profile.is_bpl = value === "yes";
          break;
        case "is_disabled":
          profile.is_disabled = value === "yes";
          break;
        case "state_confirm":
          profile.state = value === "yes" ? q.states?.[0] : "_NOT_LISTED_";
          break;
        case "residency_confirm":
          profile.residency =
            value === "yes" ? (q.residency as PartialProfile["residency"]) : "_MISMATCH_";
          break;
      }
    }
    onSubmit(profile);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((q) => {
        const prompt = promptFor(q);
        return (
          <div key={q.key}>
            <p className="mb-2 text-sm font-semibold text-ink">{prompt}</p>
            {q.key === "age" ? (
              <input
                aria-label={prompt}
                inputMode="numeric"
                value={ageRaw}
                onChange={(e) => setAnswer("age", e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder={t("agePlaceholder")}
                className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-primary"
              />
            ) : (
              <SelectButtons
                label={prompt}
                value={answers[q.key]}
                onChange={(v) => setAnswer(q.key, v)}
                options={
                  q.key === "gender"
                    ? getGenderOptions(language)
                    : q.key === "category"
                      ? getCategoryOptions(language)
                      : q.key === "income_bracket"
                        ? incomeWithSkip
                        : yesNo
                }
              />
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={!allAnswered || submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-faint disabled:shadow-none"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
        {t("checkEligibility")}
      </button>
    </form>
  );
}
