"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useBookmarks } from "@/lib/hooks";
import { toggleBookmark } from "@/lib/storage";
import type { Scheme } from "@/lib/types";

type Target = Pick<Scheme, "slug" | "scheme_name" | "state">;

/** Saves / un-saves a scheme in this browser. `icon` is the small round button
 *  used on cards; `full` is the labelled button used on the scheme page. */
export default function BookmarkButton({
  scheme,
  variant = "icon",
}: {
  scheme: Target;
  variant?: "icon" | "full";
}) {
  const { t } = useLanguage();
  const saved = useBookmarks().some((b) => b.slug === scheme.slug);
  const Icon = saved ? BookmarkCheck : BookmarkPlus;
  const label = saved ? t("schemeSaved") : t("saveScheme");

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggleBookmark(scheme)}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
          saved
            ? "border-primary bg-primary-light text-primary"
            : "border-line bg-surface text-ink hover:border-primary/50 hover:bg-primary-light"
        }`}
      >
        <Icon size={16} aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleBookmark(scheme)}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        saved ? "bg-primary text-white" : "bg-canvas text-faint hover:bg-primary-light hover:text-primary"
      }`}
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
