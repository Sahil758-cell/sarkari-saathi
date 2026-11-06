"use client";

import { Award, BookmarkX, GitCompareArrows, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/Feedback";
import { useLanguage } from "@/context/LanguageContext";
import { useBookmarks } from "@/lib/hooks";
import { stateLabel } from "@/lib/i18n/options";
import { removeBookmark } from "@/lib/storage";

const MAX_COMPARE = 3;

/** Schemes the user bookmarked, with a tick-box per scheme to compare up to three. */
export default function BookmarksSection() {
  const { language, t } = useLanguage();
  const bookmarks = useBookmarks();
  const [selected, setSelected] = useState<string[]>([]);

  // Ignore ticks for schemes removed since (the list lives in localStorage).
  const picked = selected.filter((slug) => bookmarks.some((b) => b.slug === slug));

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < MAX_COMPARE
          ? [...prev, slug]
          : prev
    );
  }

  return (
    <section aria-labelledby="saved-schemes" className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="saved-schemes" className="text-xl font-bold">
            {t("savedSchemesTitle")}
          </h2>
          {bookmarks.length > 1 ? (
            <p className="text-xs text-muted">{t("compareHint", { max: MAX_COMPARE })}</p>
          ) : null}
        </div>
        {picked.length >= 2 ? (
          <Link
            href={`/compare?slugs=${picked.map(encodeURIComponent).join(",")}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-button hover:bg-primary-dark"
          >
            <GitCompareArrows size={16} aria-hidden />
            {t("compareSelected", { n: picked.length })}
          </Link>
        ) : null}
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState icon={BookmarkX} message={t("savedSchemesEmpty")}>
          <Link
            href="/search"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("navSearch")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {bookmarks.map((b) => {
            const isPicked = picked.includes(b.slug);
            const states = b.state?.length
              ? b.state.map((s) => stateLabel(s, language)).join(", ")
              : t("central");
            return (
              <li
                key={b.slug}
                className={`flex items-start gap-3 rounded-xl bg-surface p-4 shadow-card ring-1 ${
                  isPicked ? "ring-2 ring-primary" : "ring-line"
                }`}
              >
                {bookmarks.length > 1 ? (
                  <input
                    type="checkbox"
                    checked={isPicked}
                    disabled={!isPicked && picked.length >= MAX_COMPARE}
                    onChange={() => toggle(b.slug)}
                    aria-label={`${t("compareTitle")}: ${b.name}`}
                    className="mt-3 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                ) : null}
                <Link
                  href={`/schemes/${encodeURIComponent(b.slug)}`}
                  className="flex min-w-0 flex-1 items-start gap-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                    <Award size={20} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-[15px] font-bold">{b.name}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                      <MapPin size={12} aria-hidden />
                      <span className="truncate">{states}</span>
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => removeBookmark(b.slug)}
                  aria-label={`${t("removeSaved")}: ${b.name}`}
                  className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-danger"
                >
                  <X size={18} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
