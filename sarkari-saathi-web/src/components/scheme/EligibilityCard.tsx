"use client";

import { CheckCircle2, Info, Loader2, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { useState } from "react";
import { useErrorMessage } from "@/components/Feedback";
import { useLanguage } from "@/context/LanguageContext";
import { checkEligibility, getQuestions } from "@/lib/api";
import { useSavedProfiles } from "@/lib/hooks";
import type { StringKey } from "@/lib/i18n/strings";
import type { EligibilityOut, PartialProfile, QuestionSpec } from "@/lib/types";
import DynamicQuestionForm from "./DynamicQuestionForm";

// Matches the `field` names the backend's matcher reports in `reasons`.
const REASON_KEYS: Record<string, StringKey> = {
  age_min: "reasonAgeMin",
  age_max: "reasonAgeMax",
  gender: "reasonGender",
  state: "reasonState",
  category: "reasonCategory",
  income: "reasonIncome",
  bpl: "reasonBpl",
  disability: "reasonDisability",
  residency: "reasonResidency",
};

/**
 * `hasUncheckableRules`: the scheme has rules (listed under Conditions, or it
 * was read from the web) that the structured check can't evaluate. In that
 * case "no checkable restrictions" must not be presented as "you're eligible".
 */
export default function EligibilityCard({
  slug,
  hasUncheckableRules = false,
}: {
  slug: string;
  hasUncheckableRules?: boolean;
}) {
  const { t } = useLanguage();
  const errorMessage = useErrorMessage();

  // The parent keys this component by slug, so state resets per scheme.
  const profiles = useSavedProfiles() ?? [];
  const [questions, setQuestions] = useState<QuestionSpec[]>();
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<EligibilityOut>();
  const [error, setError] = useState<string>();

  async function runCheck(profile: PartialProfile) {
    setError(undefined);
    setChecking(true);
    try {
      setResult(await checkEligibility(slug, profile));
      setQuestions(undefined);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  async function startQuestions() {
    setResult(undefined);
    setError(undefined);
    setLoadingQuestions(true);
    try {
      const q = await getQuestions(slug);
      if (q.length === 0) {
        // Scheme lists no restrictions the matcher can check — eligible by default.
        await runCheck({});
      } else {
        setQuestions(q);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingQuestions(false);
    }
  }

  function reset() {
    setResult(undefined);
    setQuestions(undefined);
    setError(undefined);
  }

  const busy = checking || loadingQuestions;

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <ShieldCheck size={20} className="text-primary" aria-hidden />
        {t("checkMyEligibility")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("eligibilityIntro")}</p>

      <div aria-live="polite">
        {result && hasUncheckableRules && result.eligible && result.reasons.length === 0 ? (
          <div className="mt-4">
            <div className="rounded-xl bg-canvas p-4 ring-1 ring-line">
              <p className="flex items-center gap-2 font-bold text-ink">
                <Info size={20} className="text-muted" aria-hidden />
                {t("cannotCheckAutomatically")}
              </p>
              <p className="mt-2 text-sm text-muted">{t("cannotCheckAutomaticallyText")}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-3 w-full rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light"
            >
              {t("checkAgain")}
            </button>
          </div>
        ) : result ? (
          <div className="mt-4">
            <div
              className={`rounded-xl p-4 ${
                result.eligible ? "bg-primary-light" : "bg-danger-light"
              }`}
            >
              <p
                className={`flex items-center gap-2 font-bold ${
                  result.eligible ? "text-primary" : "text-danger"
                }`}
              >
                {result.eligible ? (
                  <CheckCircle2 size={20} aria-hidden />
                ) : (
                  <XCircle size={20} aria-hidden />
                )}
                {result.eligible ? t("youAppearEligible") : t("youMayNotBeEligible")}
              </p>
              {result.reasons.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                      <span>{REASON_KEYS[r.field] ? t(REASON_KEYS[r.field]) : r.field}</span>
                    </li>
                  ))}
                </ul>
              ) : result.eligible ? (
                <p className="mt-2 text-sm text-muted">{t("noRestrictions")}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-3 w-full rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light"
            >
              {t("checkAgain")}
            </button>
          </div>
        ) : questions ? (
          <div className="mt-4">
            <DynamicQuestionForm questions={questions} onSubmit={runCheck} submitting={checking} />
            <button
              type="button"
              onClick={reset}
              className="mt-3 w-full text-center text-sm font-semibold text-muted hover:text-ink"
            >
              {t("cancel")}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {profiles.length > 0 ? (
              <>
                <p className="text-sm font-semibold">{t("chooseSavedProfile")}</p>
                <ul className="space-y-2">
                  {profiles.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runCheck(p.profile)}
                        className="flex w-full items-center gap-3 rounded-xl border border-line bg-canvas p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary-light disabled:opacity-60"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                          <UserRound size={18} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{p.name}</span>
                          <span className="block truncate text-xs text-muted">{p.label}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="pt-1 text-center text-xs text-faint">{t("orAnswerQuestions")}</p>
              </>
            ) : null}
            <button
              type="button"
              onClick={startQuestions}
              disabled={busy}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                profiles.length > 0
                  ? "border border-primary text-primary hover:bg-primary-light"
                  : "bg-primary text-white shadow-button hover:bg-primary-dark"
              }`}
            >
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
              {profiles.length > 0 ? t("answerQuestionsForScheme") : t("checkEligibility")}
            </button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
