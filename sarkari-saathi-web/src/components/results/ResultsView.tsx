"use client";

import { BookmarkCheck, BookmarkPlus, FileX2, Pencil } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState, ErrorBox, PageHeading, Spinner, useErrorMessage } from "@/components/Feedback";
import SchemeCard from "@/components/SchemeCard";
import { useLanguage } from "@/context/LanguageContext";
import { matchProfile } from "@/lib/api";
import { useFetch, useSavedProfiles } from "@/lib/hooks";
import {
  getCategoryOptions,
  getGenderOptions,
  getIncomeOptions,
  getOccupationOptions,
  getResidencyOptions,
  MAX_SAVED_PROFILES,
} from "@/lib/constants";
import { stateLabel } from "@/lib/i18n/options";
import { profileFromQuery, sameProfile } from "@/lib/profileQuery";
import { saveProfile } from "@/lib/storage";
import type { Profile, Scheme } from "@/lib/types";

type Filter = "all" | "central" | "state";

const isCentral = (s: Scheme) => !s.state || s.state.length === 0;

// Remounted (via `key`) for each distinct profile, so its inputs reset
// naturally. Saving updates localStorage, which re-renders the parent with
// the "Profile saved" state.
function SaveProfileForm({ profile }: { profile: Profile }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      saveProfile(profile, name.trim());
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWentWrong"));
    }
  }

  return (
    <form onSubmit={handleSave}>
      <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">
        {t("saveThisProfile")}
      </label>
      <div className="flex gap-2">
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          aria-label={t("profileNameLabel")}
          className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm placeholder:text-faint focus:border-primary"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-faint"
        >
          <BookmarkPlus size={16} aria-hidden />
          {t("saveProfileAction")}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export default function ResultsView() {
  const { language, t } = useLanguage();
  const errorMessage = useErrorMessage();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const profile = useMemo(
    () => profileFromQuery(new URLSearchParams(queryString)),
    [queryString]
  );

  const [filter, setFilter] = useState<Filter>("all");

  const matchFetch = useFetch(
    `${queryString}|${language}`,
    () => matchProfile(profile!, 50, language),
    !!profile
  );
  const results = matchFetch.data?.results;
  const error = matchFetch.error ? errorMessage(matchFetch.error) : undefined;

  const saved = useSavedProfiles() ?? [];
  const savedMatch = profile ? saved.find((p) => sameProfile(p.profile, profile)) : undefined;
  const atCap = saved.length >= MAX_SAVED_PROFILES;

  if (!profile) {
    return (
      <EmptyState icon={FileX2} message={t("invalidProfile")}>
        <Link
          href="/check"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("findMySchemes")}
        </Link>
      </EmptyState>
    );
  }

  const centralCount = results?.filter(isCentral).length ?? 0;
  const stateCount = (results?.length ?? 0) - centralCount;
  const visible = (results ?? []).filter((s) =>
    filter === "all" ? true : filter === "central" ? isCentral(s) : !isCentral(s)
  );

  const label = (opts: { value: string; label: string }[], v?: string) =>
    v ? (opts.find((o) => o.value === v)?.label ?? v) : undefined;

  const summary: [string, string][] = [
    [t("age"), String(profile.age)],
    [t("gender"), label(getGenderOptions(language), profile.gender)!],
    [t("state"), stateLabel(profile.state, language)],
    [t("residency"), label(getResidencyOptions(language), profile.residency)!],
    [t("category"), label(getCategoryOptions(language), profile.category)!],
    ...(profile.income_bracket
      ? ([[t("annualIncome"), label(getIncomeOptions(language), profile.income_bracket)!]] as [
          string,
          string,
        ][])
      : []),
    ...(profile.occupation
      ? ([[t("occupation"), label(getOccupationOptions(language), profile.occupation)!]] as [
          string,
          string,
        ][])
      : []),
    ...(profile.is_bpl ? ([["BPL", t("yes")]] as [string, string][]) : []),
    ...(profile.is_disabled ? ([[t("haveDisability"), t("yes")]] as [string, string][]) : []),
  ];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: t("filterAll"), count: results?.length ?? 0 },
    { key: "central", label: t("filterCentral"), count: centralCount },
    { key: "state", label: t("filterState"), count: stateCount },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {/* Profile summary */}
        <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold">{savedMatch?.name ?? t("yourProfile")}</h2>
            <Link
              href={savedMatch ? `/check?edit=${savedMatch.id}` : "/check"}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Pencil size={12} aria-hidden />
              {t("editProfile")}
            </Link>
          </div>
          <dl className="divide-y divide-line text-sm">
            {summary.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Save profile */}
        <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
          {savedMatch ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BookmarkCheck size={18} aria-hidden />
              {t("profileSaved")}
            </p>
          ) : atCap ? (
            <p className="text-xs text-muted">
              {t("profileLimitReachedShort", { max: MAX_SAVED_PROFILES })}
            </p>
          ) : (
            <SaveProfileForm key={queryString} profile={profile} />
          )}
        </section>

        {/* Central / State filter */}
        <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
          <h2 className="mb-3 text-sm font-semibold">{t("filterBy")}</h2>
          <div role="radiogroup" aria-label={t("filterBy")} className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface hover:border-primary/50 hover:bg-primary-light"
                }`}
              >
                {f.label}
                {results ? <span className="ml-1.5 opacity-70">{f.count}</span> : null}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section aria-live="polite">
        <PageHeading
          title={t("resultsTitle")}
          subtitle={
            results ? t("showingCount", { count: visible.length, total: results.length }) : undefined
          }
        />
        {error ? (
          <ErrorBox message={error} onRetry={matchFetch.reload} />
        ) : !results ? (
          <Spinner />
        ) : results.length === 0 ? (
          <EmptyState icon={FileX2} message={t("noMatchingSchemes")}>
            <Link
              href="/search"
              className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary-light"
            >
              {t("searchInstead")}
            </Link>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState icon={FileX2} message={t("noSchemesForFilter")} />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {visible.map((s) => (
              <SchemeCard key={s.slug} scheme={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
