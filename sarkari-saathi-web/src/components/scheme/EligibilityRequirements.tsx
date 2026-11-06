"use client";

import { ListChecks } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  GENDER_OPTIONS,
  labelFor,
  OCCUPATION_OPTIONS,
  RESIDENCY_OPTIONS,
  stateLabel,
} from "@/lib/i18n/options";
import type { Scheme } from "@/lib/types";

/**
 * Shown instead of the "Check my eligibility" form for schemes read from the
 * web: their rules can't be checked reliably against a profile, so the useful
 * thing is to show plainly what the scheme requires.
 */
export default function EligibilityRequirements({ scheme }: { scheme: Scheme }) {
  const { language, t } = useLanguage();

  const items: string[] = [];
  if (scheme.state?.length)
    items.push(`${t("state")}: ${scheme.state.map((s) => stateLabel(s, language)).join(", ")}`);
  if (scheme.category?.length)
    items.push(`${t("category")}: ${scheme.category.map((c) => c.toUpperCase()).join(", ")}`);
  if (scheme.occupation?.length)
    items.push(
      `${t("occupation")}: ${scheme.occupation
        .map((o) => labelFor(o.toLowerCase(), OCCUPATION_OPTIONS, language))
        .join(", ")}`
    );
  if (scheme.gender && ["male", "female"].includes(scheme.gender.toLowerCase()))
    items.push(`${t("gender")}: ${labelFor(scheme.gender.toLowerCase(), GENDER_OPTIONS, language)}`);
  if (scheme.residency && ["rural", "urban"].includes(scheme.residency.toLowerCase()))
    items.push(
      `${t("residency")}: ${labelFor(scheme.residency.toLowerCase(), RESIDENCY_OPTIONS, language)}`
    );
  if (scheme.age_min != null && scheme.age_max != null)
    items.push(t("ageRange", { min: scheme.age_min, max: scheme.age_max }));
  else if (scheme.age_min != null) items.push(t("ageFrom", { min: scheme.age_min }));
  else if (scheme.age_max != null) items.push(t("ageUpTo", { max: scheme.age_max }));
  if (scheme.max_annual_income != null)
    items.push(t("incomeLimit", { amount: scheme.max_annual_income.toLocaleString("en-IN") }));
  if (scheme.is_bpl_required) items.push(t("bplOnly"));
  if (scheme.is_disabled_targeted) items.push(t("disabilityTargeted"));
  items.push(...scheme.other_conditions);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <ListChecks size={20} className="text-primary" aria-hidden />
        {t("eligibilityRequired")}
      </h2>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted">{t("eligibilityNotFound")}</p>
      )}

      <p className="mt-4 text-xs text-muted">{t("eligibilityVerifyNote")}</p>
    </section>
  );
}
