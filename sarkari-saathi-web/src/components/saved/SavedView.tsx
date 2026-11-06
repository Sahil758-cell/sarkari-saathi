"use client";

import { Bookmark, ChevronRight, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, PageHeading } from "@/components/Feedback";
import BookmarksSection from "./BookmarksSection";
import { useLanguage } from "@/context/LanguageContext";
import { MAX_SAVED_PROFILES } from "@/lib/constants";
import { useSavedProfiles } from "@/lib/hooks";
import { GENDER_OPTIONS, labelFor, stateLabel } from "@/lib/i18n/options";
import { profileToQuery } from "@/lib/profileQuery";
import { deleteProfile } from "@/lib/storage";
import type { SavedProfile } from "@/lib/types";

export default function SavedView() {
  const { language, t } = useLanguage();
  // Live view of localStorage, so edits made on /check show up without a reload.
  const profiles = useSavedProfiles();
  const [filter, setFilter] = useState("");
  const [confirmId, setConfirmId] = useState<string>();

  // Re-localised on the fly (the stored label is English-only).
  const describe = (p: SavedProfile) =>
    `${p.profile.age}, ${labelFor(p.profile.gender, GENDER_OPTIONS, language)}, ${stateLabel(
      p.profile.state,
      language
    )}`;

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!profiles) return [];
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        describe(p).toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, filter, language]);

  function handleDelete(id: string) {
    deleteProfile(id);
    setConfirmId(undefined);
  }

  if (!profiles) return null; // first client render — storage not read yet

  const atCap = profiles.length >= MAX_SAVED_PROFILES;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageHeading title={t("savedTitle")} subtitle={t("savedIntro")} />
        {!atCap ? (
          <Link
            href="/check"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-button hover:bg-primary-dark"
          >
            <Plus size={16} aria-hidden />
            {t("createProfile")}
          </Link>
        ) : null}
      </div>

      <BookmarksSection />

      <h2 className="mb-3 text-xl font-bold">{t("savedProfilesTitle")}</h2>
      {profiles.length === 0 ? (
        <EmptyState icon={Bookmark} message={t("noSavedProfiles")}>
          <Link
            href="/check"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("createProfile")}
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md">
              <label htmlFor="saved-filter" className="sr-only">
                {t("searchSavedPlaceholder")}
              </label>
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                id="saved-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t("searchSavedPlaceholder")}
                className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm placeholder:text-faint focus:border-primary"
              />
            </div>
            <p className="text-xs text-muted">
              {t("slotsUsed", { count: profiles.length, max: MAX_SAVED_PROFILES })}
            </p>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={Search} message={t("noSavedMatch")} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visible.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                      <UserRound size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold">{p.name}</h2>
                      <p className="truncate text-sm text-muted">{describe(p)}</p>
                    </div>
                    <Link
                      href={`/check?edit=${encodeURIComponent(p.id)}`}
                      aria-label={`${t("edit")}: ${p.name}`}
                      className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"
                    >
                      <Pencil size={18} aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmId(p.id)}
                      aria-label={`${t("delete")}: ${p.name}`}
                      className="rounded-lg p-2 text-danger hover:bg-danger-light"
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </div>

                  {confirmId === p.id ? (
                    <div
                      role="alertdialog"
                      aria-label={t("deleteProfileTitle")}
                      className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-light px-3 py-2"
                    >
                      <p className="text-sm text-danger">
                        {t("deleteProfileConfirm", { name: p.name })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmId(undefined)}
                          className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line"
                        >
                          {t("cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/results?${profileToQuery(p.profile)}`}
                      className="mt-3 flex items-center justify-between rounded-lg bg-primary-light px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-light/70"
                    >
                      {t("viewSchemes")}
                      <ChevronRight size={16} aria-hidden />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {atCap ? (
            <p className="mt-4 text-xs text-muted">
              {t("savedLimitNote", { max: MAX_SAVED_PROFILES })}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
