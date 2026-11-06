"use client";

import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SelectButtons from "@/components/SelectButtons";
import { useLanguage } from "@/context/LanguageContext";
import {
  getCategoryOptions,
  getGenderOptions,
  getIncomeOptions,
  getOccupationOptions,
  getResidencyOptions,
  MAX_SAVED_PROFILES,
  WIZARD_STEPS,
} from "@/lib/constants";
import { STATES, stateLabel } from "@/lib/i18n/options";
import { profileToQuery } from "@/lib/profileQuery";
import { getProfile, listProfiles, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/types";

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span className={`text-xs ${required ? "text-primary" : "text-faint"}`}>
          {required ? t("required") : t("optional")}
        </span>
      </div>
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-primary";

export default function CheckWizard() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const editId = useSearchParams().get("edit") ?? undefined;

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<string>();
  const [state, setState] = useState<string>();
  const [stateFilter, setStateFilter] = useState("");
  const [residency, setResidency] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [income, setIncome] = useState<string>();
  const [occupation, setOccupation] = useState<string>();
  const [isBpl, setIsBpl] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [shouldSave, setShouldSave] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [saveError, setSaveError] = useState<string>();
  const [touchedAge, setTouchedAge] = useState(false);
  const [touchedName, setTouchedName] = useState(false);

  // Runs on mount and again whenever the page becomes visible after being
  // hidden (Next keeps recently-visited routes alive), so every visit starts
  // fresh — or pre-filled from the saved profile when editing.
  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset/prefill whenever the wizard is (re)shown */
  useEffect(() => {
    setSavedCount(listProfiles().length);
    setStep(0);
    setStateFilter("");
    setTouchedAge(false);
    setTouchedName(false);
    setSaveError(undefined);
    setShouldSave(true);

    const saved = editId ? getProfile(editId) : null;
    const p = saved?.profile;
    setName(saved?.name ?? "");
    setAge(p ? String(p.age) : "");
    setGender(p?.gender);
    setState(p?.state);
    setResidency(p?.residency);
    setCategory(p?.category);
    setIncome(p?.income_bracket);
    setOccupation(p?.occupation);
    setIsBpl(p?.is_bpl ?? false);
    setIsDisabled(p?.is_disabled ?? false);
  }, [editId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const nameValid = name.trim().length > 0;
  const ageNumber = Number(age);
  const ageValid =
    age.trim().length > 0 && Number.isInteger(ageNumber) && ageNumber >= 1 && ageNumber <= 120;
  const atCap = !editId && savedCount >= MAX_SAVED_PROFILES;

  const stepValid = [
    nameValid && ageValid && !!gender,
    !!state && !!residency,
    !!category,
    true,
    true,
  ];
  const total = WIZARD_STEPS.length;

  const stateOptions = useMemo(() => {
    const q = stateFilter.trim().toLowerCase();
    return STATES.filter(
      ([en, hi]) => !q || en.toLowerCase().includes(q) || hi.toLowerCase().includes(q)
    ).map(([en]) => ({ value: en, label: stateLabel(en, language) }));
  }, [stateFilter, language]);

  function canJumpTo(i: number) {
    if (i <= step) return true;
    return stepValid.slice(0, i).every(Boolean);
  }

  function labelOf(opts: { value: string; label: string }[], v?: string) {
    return v ? (opts.find((o) => o.value === v)?.label ?? v) : undefined;
  }

  function handleSubmit() {
    if (!nameValid || !ageValid || !gender || !state || !category || !residency) return;
    const profile: Profile = {
      age: ageNumber,
      gender: gender as Profile["gender"],
      state,
      category: category as Profile["category"],
      residency: residency as Profile["residency"],
      income_bracket: (income || undefined) as Profile["income_bracket"],
      occupation: occupation || undefined,
      is_bpl: isBpl,
      is_disabled: isDisabled,
    };
    setSaveError(undefined);
    if (shouldSave && !atCap) {
      try {
        saveProfile(profile, name.trim(), editId);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : t("somethingWentWrong"));
        return;
      }
    }
    router.push(`/results?${profileToQuery(profile)}`);
  }

  function handleNext() {
    if (step === 0) {
      setTouchedAge(true);
      setTouchedName(true);
    }
    if (!stepValid[step]) return;
    if (step < total - 1) setStep(step + 1);
  }

  const reviewRows: [string, string][] = [
    [t("name"), name.trim() || "—"],
    [t("age"), age || "—"],
    [t("gender"), labelOf(getGenderOptions(language), gender) ?? "—"],
    [t("state"), state ? stateLabel(state, language) : "—"],
    [t("residency"), labelOf(getResidencyOptions(language), residency) ?? "—"],
    [t("category"), labelOf(getCategoryOptions(language), category) ?? "—"],
    [t("annualIncome"), labelOf(getIncomeOptions(language), income) ?? t("skip")],
    [t("occupation"), labelOf(getOccupationOptions(language), occupation) ?? t("skip")],
    [t("belowPovertyLine"), isBpl ? t("yes") : t("no")],
    [t("haveDisability"), isDisabled ? t("yes") : t("no")],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar — step list (desktop) */}
      <aside className="hidden lg:block">
        <nav
          aria-label={t("findMySchemes")}
          className="sticky top-24 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line"
        >
          <ol className="space-y-1">
            {WIZARD_STEPS.map((s, i) => {
              const current = i === step;
              const done = i < step && stepValid[i];
              const enabled = canJumpTo(i);
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => setStep(i)}
                    aria-current={current ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                      current ? "bg-primary-light" : enabled ? "hover:bg-canvas" : "opacity-60"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        done || current ? "bg-primary text-white" : "bg-line text-muted"
                      }`}
                    >
                      {done ? <Check size={16} aria-hidden /> : i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{t(s.title)}</span>
                      <span className="block text-xs text-muted">{t(s.desc)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 flex gap-2 rounded-xl bg-canvas p-3 text-xs text-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            {t("wizardSideNote")}
          </p>
        </nav>
      </aside>

      {/* Form */}
      <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line sm:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <p className="text-xs font-semibold text-muted">
              {t("stepXOfY", { step: step + 1, total })}
            </p>
            <p className="text-xs text-muted lg:hidden">{t(WIZARD_STEPS[step].title)}</p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step + 1}
            className="h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {editId ? (
          <p className="mb-4 rounded-lg bg-primary-light px-3 py-2 text-xs font-medium text-primary-dark">
            {t("editingProfile")}
          </p>
        ) : null}

        <h1 className="mb-1 text-xl font-bold">{t(WIZARD_STEPS[step].title)}</h1>
        <p className="mb-6 text-sm text-muted">{t(WIZARD_STEPS[step].desc)}</p>

        {step === 0 ? (
          <>
            <Field
              label={t("name")}
              required
              htmlFor="f-name"
              error={touchedName && !nameValid ? t("nameRequired") : undefined}
            >
              <input
                id="f-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouchedName(true)}
                placeholder={t("namePlaceholder")}
                autoComplete="name"
              />
            </Field>
            <Field
              label={t("age")}
              required
              htmlFor="f-age"
              error={touchedAge && !ageValid ? t("ageError") : undefined}
            >
              <input
                id="f-age"
                className={`${inputClass} sm:max-w-[200px]`}
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                onBlur={() => setTouchedAge(true)}
                placeholder={t("agePlaceholder")}
              />
            </Field>
            <Field label={t("gender")} required>
              <SelectButtons
                label={t("gender")}
                options={getGenderOptions(language)}
                value={gender}
                onChange={setGender}
              />
            </Field>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field label={t("state")} required htmlFor="f-state-filter">
              <input
                id="f-state-filter"
                className={`${inputClass} mb-3 sm:max-w-xs`}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                placeholder={t("selectState")}
              />
              <div className="max-h-64 overflow-y-auto rounded-lg border border-line p-3">
                <SelectButtons
                  label={t("state")}
                  options={stateOptions}
                  value={state}
                  onChange={setState}
                />
              </div>
              {state ? (
                <p className="mt-2 text-xs text-muted">
                  {t("state")}: <b className="text-ink">{stateLabel(state, language)}</b>
                </p>
              ) : null}
            </Field>
            <Field label={t("residency")} required>
              <SelectButtons
                label={t("residency")}
                options={getResidencyOptions(language)}
                value={residency}
                onChange={setResidency}
              />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label={t("category")} required>
              <SelectButtons
                label={t("category")}
                options={getCategoryOptions(language)}
                value={category}
                onChange={setCategory}
              />
            </Field>
            <Field label={t("annualIncome")}>
              <SelectButtons
                label={t("annualIncome")}
                options={getIncomeOptions(language)}
                value={income}
                onChange={setIncome}
                allowClear
              />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label={t("occupation")}>
              <SelectButtons
                label={t("occupation")}
                options={getOccupationOptions(language)}
                value={occupation}
                onChange={setOccupation}
                allowClear
              />
            </Field>
            <div className="divide-y divide-line rounded-xl bg-canvas px-4">
              <Toggle checked={isBpl} onChange={setIsBpl} label={t("belowPovertyLine")} />
              <Toggle checked={isDisabled} onChange={setIsDisabled} label={t("haveDisability")} />
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <dl className="divide-y divide-line rounded-xl bg-canvas px-4">
              {reviewRows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 rounded-xl bg-canvas px-4">
              {atCap ? (
                <p className="py-3 text-xs text-muted">
                  {t("profileLimitReached", { max: MAX_SAVED_PROFILES })}
                </p>
              ) : (
                <Toggle
                  checked={shouldSave}
                  onChange={setShouldSave}
                  label={editId ? t("saveChangesToProfile") : t("saveThisProfile")}
                />
              )}
            </div>
            {saveError ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {saveError}
              </p>
            ) : null}
          </>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-light"
            >
              <ArrowLeft size={16} aria-hidden />
              {t("back")}
            </button>
          ) : (
            <span />
          )}
          {step < total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step !== 0 && !stepValid[step]}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-faint disabled:shadow-none"
            >
              {t("next")}
              <ArrowRight size={16} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-dark"
            >
              {t("findMatchingSchemes")}
              <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
