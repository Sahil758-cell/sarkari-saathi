"use client";

import {
  ArrowRight,
  Bell,
  Bookmark,
  FileText,
  Search,
  Sparkles,
  ListChecks,
  UserRound,
  UserCheck,
  BadgeCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBox, Spinner, useErrorMessage } from "@/components/Feedback";
import SchemeCard from "@/components/SchemeCard";
import { useLanguage } from "@/context/LanguageContext";
import { getLatestSchemes } from "@/lib/api";
import { CATEGORIES, POPULAR_SEARCHES, WIZARD_STEPS } from "@/lib/constants";
import { useFetch } from "@/lib/hooks";
import type { StringKey } from "@/lib/i18n/strings";

const QUICK_ACTIONS: {
  href: string;
  title: StringKey;
  subtitle: StringKey;
  icon: typeof Search;
}[] = [
  { href: "/search", title: "searchScheme", subtitle: "searchSchemeSubtitle", icon: Search },
  { href: "/assistant", title: "askAi", subtitle: "askAiSubtitle", icon: Sparkles },
  { href: "/documents", title: "documents", subtitle: "documentsSubtitle", icon: FileText },
  { href: "/saved", title: "saved", subtitle: "savedSubtitle", icon: Bookmark },
  { href: "/for-you", title: "forYouTitle", subtitle: "forYouTile", icon: UserCheck },
  { href: "/new", title: "newTitle", subtitle: "newTile", icon: Bell },
];

export default function HomeView() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const [query, setQuery] = useState("");

  const latestFetch = useFetch(`latest:${language}`, () => getLatestSchemes(6, language));
  const latest = latestFetch.data?.results;
  const latestError = latestFetch.error ? errorMessage(latestFetch.error) : undefined;
  const loadLatest = latestFetch.reload;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-light to-canvas">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-16">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-primary-dark sm:text-4xl lg:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted">{t("heroSubtitle")}</p>

            <form onSubmit={submitSearch} className="mt-6 flex max-w-xl flex-wrap gap-2" role="search">
              <label htmlFor="home-search" className="sr-only">
                {t("searchPlaceholder")}
              </label>
              <div className="relative min-w-[14rem] flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
                  aria-hidden
                />
                <input
                  id="home-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-4 text-sm shadow-card placeholder:text-faint focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-button transition hover:bg-primary-dark"
              >
                {t("search")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = query.trim();
                  router.push(q ? `/assistant?q=${encodeURIComponent(q)}` : "/assistant");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-surface px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
              >
                <Sparkles size={15} aria-hidden />
                {t("askAi")}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">{t("popularSearches")}:</span>
              {POPULAR_SEARCHES.map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-primary/50 hover:bg-primary-light"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Find My Schemes card */}
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-button sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <ListChecks size={14} aria-hidden />
              {t("fiveSteps")}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold">{t("findMySchemes")}</h2>
            <p className="mt-1 text-sm text-white/80">{t("findMySchemesSubtitle")}</p>

            <ol className="mt-5 space-y-2.5">
              {WIZARD_STEPS.map((step, i) => (
                <li key={step.title} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{t(step.title)}</span>
                </li>
              ))}
            </ol>

            <Link
              href="/check"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-primary-dark transition hover:bg-primary-light"
            >
              {t("findMySchemesCta")}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        {/* Quick actions */}
        <section aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="mb-4 text-xl font-bold">
            {t("quickActions")}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-primary/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
                  <a.icon size={20} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-bold">{t(a.title)}</span>
                  <span className="block text-xs text-muted">{t(a.subtitle)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section aria-labelledby="categories">
          <h2 id="categories" className="mb-4 text-xl font-bold">
            {t("popularCategories")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                href={`/search?q=${encodeURIComponent(c.label)}`}
                className="flex flex-col items-center gap-2 rounded-xl bg-surface px-3 py-5 text-center shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-primary-light hover:ring-primary/40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
                  <c.icon size={22} aria-hidden />
                </span>
                <span className="text-sm font-semibold">{t(c.labelKey)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest schemes */}
        <section aria-labelledby="latest">
          <div className="mb-4">
            <h2 id="latest" className="text-xl font-bold">
              {t("latestSchemes")}
            </h2>
            <p className="text-sm text-muted">{t("latestSchemesSubtitle")}</p>
          </div>
          {latestError ? (
            <ErrorBox message={latestError} onRetry={loadLatest} />
          ) : !latest ? (
            <Spinner />
          ) : latest.length === 0 ? (
            <p className="text-sm text-muted">{t("noSchemesYet")}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {latest.map((s) => (
                <SchemeCard key={s.slug} scheme={s} />
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section
          aria-labelledby="how"
          className="rounded-2xl bg-surface p-6 ring-1 ring-line sm:p-8"
        >
          <h2 id="how" className="mb-6 text-xl font-bold">
            {t("howItWorks")}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {(
              [
                { icon: UserRound, title: "how1Title", desc: "how1Desc" },
                { icon: ListChecks, title: "how2Title", desc: "how2Desc" },
                { icon: BadgeCheck, title: "how3Title", desc: "how3Desc" },
              ] as const
            ).map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <s.icon size={20} aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    {i + 1}
                  </p>
                  <h3 className="font-bold">{t(s.title)}</h3>
                  <p className="mt-1 text-sm text-muted">{t(s.desc)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
