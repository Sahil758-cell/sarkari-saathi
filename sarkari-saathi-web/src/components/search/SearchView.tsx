"use client";

import { Clock, Search, SearchX, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmptyState, ErrorBox, PageHeading, Spinner, useErrorMessage } from "@/components/Feedback";
import SchemeCard from "@/components/SchemeCard";
import { useLanguage } from "@/context/LanguageContext";
import { searchLive, searchSchemes } from "@/lib/api";
import { CATEGORIES, POPULAR_SEARCHES } from "@/lib/constants";
import type { StringKey } from "@/lib/i18n/strings";
import { useFetch, useSearchHistory } from "@/lib/hooks";
import { addSearchHistory, clearSearchHistory } from "@/lib/storage";

const DEBOUNCE_MS = 350;
// The live (official-website) lookup is slow and costs a web search + AI call,
// so it only starts once the query has been left alone this long (or on Enter)
// — not on every half-typed word.
const LIVE_DELAY_MS = 1200;

const askAiHref = (q: string) => `/assistant?q=${encodeURIComponent(q)}`;

function relativeTime(
  timestamp: number,
  t: (key: StringKey, vars?: Record<string, string | number>) => string
): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("daysAgo", { n: days });
  return t("weeksAgo", { n: Math.floor(days / 7) });
}

export default function SearchView() {
  const { language, t } = useLanguage();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const urlQuery = useSearchParams().get("q") ?? "";

  const [text, setText] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery.trim());
  const [liveQuery, setLiveQuery] = useState("");
  const lastSyncedUrl = useRef(urlQuery.trim());

  const history = useSearchHistory();

  // Pick up changes made from outside this page (e.g. a popular-search link).
  // Changes this page pushed itself are skipped via `lastSyncedUrl`, so typing
  // is never overwritten by an older URL value arriving late.
  useEffect(() => {
    const incoming = urlQuery.trim();
    if (incoming !== lastSyncedUrl.current) {
      lastSyncedUrl.current = incoming;
      setText(urlQuery);
      setQuery(incoming);
    }
  }, [urlQuery]);

  // Debounce typing → query, and keep the URL in sync.
  useEffect(() => {
    const id = setTimeout(() => {
      const v = text.trim();
      setQuery(v);
      if (v !== lastSyncedUrl.current) {
        lastSyncedUrl.current = v;
        router.replace(v ? `/search?q=${encodeURIComponent(v)}` : "/search", { scroll: false });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, router]);

  const searchFetch = useFetch(
    `${query}|${language}`,
    async (signal) => {
      const res = await searchSchemes(query, 20, language, signal);
      // Only successful searches that found something go into recent searches.
      if (res.results.length > 0 && !signal.aborted) addSearchHistory(query);
      return res;
    },
    !!query
  );
  const results = searchFetch.data?.results;
  const error = searchFetch.error ? errorMessage(searchFetch.error) : undefined;

  // Nothing in our own list → look the scheme up on official government sites.
  const noLocalResults = !!query && results?.length === 0;
  useEffect(() => {
    if (!noLocalResults) return;
    const id = setTimeout(() => setLiveQuery(query), LIVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [noLocalResults, query]);

  const liveFetch = useFetch(
    `live:${query}|${language}`,
    async (signal) => {
      const res = await searchLive(query, language, signal);
      if (res.results.length > 0 && !signal.aborted) addSearchHistory(query);
      return res;
    },
    noLocalResults && liveQuery === query
  );
  const liveResults = liveFetch.data?.results;
  const liveError = liveFetch.error ? errorMessage(liveFetch.error) : undefined;

  const showDiscovery = !query;

  return (
    <>
      <PageHeading title={t("findRightScheme")} subtitle={t("findRightSchemeSubtitle")} />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(text.trim());
          setLiveQuery(text.trim()); // Enter = skip the wait before the live lookup
        }}
        className="relative max-w-2xl"
      >
        <label htmlFor="search-input" className="sr-only">
          {t("searchPlaceholder")}
        </label>
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          id="search-input"
          type="search"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-11 text-sm shadow-card placeholder:text-faint focus:border-primary [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button
            type="button"
            onClick={() => setText("")}
            aria-label={t("clearSearch")}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-canvas"
          >
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </form>

      <div className="mt-8" aria-live="polite">
        {showDiscovery ? (
          <div className="space-y-10">
            <section>
              <h2 className="mb-3 text-lg font-bold">{t("popularSearches")}</h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setText(s)}
                    className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary-light"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">{t("categories")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setText(c.label)}
                    className="flex flex-col items-center gap-2 rounded-xl bg-surface px-3 py-4 text-center shadow-card ring-1 ring-line transition hover:bg-primary-light hover:ring-primary/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
                      <c.icon size={20} aria-hidden />
                    </span>
                    <span className="text-sm font-semibold">{t(c.labelKey)}</span>
                  </button>
                ))}
              </div>
            </section>

            {history.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold">{t("recentSearches")}</h2>
                  <button
                    type="button"
                    onClick={clearSearchHistory}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {t("clearAll")}
                  </button>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                  {history.map((h) => (
                    <li key={h.query}>
                      <button
                        type="button"
                        onClick={() => setText(h.query)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-canvas"
                      >
                        <Clock size={16} className="shrink-0 text-faint" aria-hidden />
                        <span className="flex-1 truncate font-medium">{h.query}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {relativeTime(h.timestamp, t)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : error ? (
          <ErrorBox message={error} onRetry={searchFetch.reload} />
        ) : !results ? (
          <Spinner label={t("searching")} />
        ) : results.length === 0 ? (
          liveError ? (
            <ErrorBox message={liveError} onRetry={liveFetch.reload} />
          ) : !liveResults ? (
            <Spinner label={t("searchingOfficialSites")} />
          ) : liveResults.length > 0 ? (
            <>
              <p className="mb-1 text-sm font-semibold text-primary">{t("foundOnOfficialSites")}</p>
              <p className="mb-3 text-xs text-muted">{t("liveResultNote")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {liveResults.map((s) => (
                  <SchemeCard key={s.slug} scheme={s} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={SearchX} message={t("noSchemesFoundFor", { query })}>
              <p className="max-w-sm text-xs text-muted">{t("liveNotFoundHint")}</p>
              <Link
                href={askAiHref(query)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-dark"
              >
                <Sparkles size={15} aria-hidden />
                {t("askAiAbout", { query })}
              </Link>
            </EmptyState>
          )
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">{results.length === 1 ? t("resultsFoundOne") : t("resultsFound", { count: results.length })}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((s) => (
                <SchemeCard key={s.slug} scheme={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
