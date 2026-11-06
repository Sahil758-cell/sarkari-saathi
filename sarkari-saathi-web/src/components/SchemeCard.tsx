"use client";

import { Award, ChevronRight, MapPin, ShieldAlert } from "lucide-react";
import Link from "next/link";
import BookmarkButton from "@/components/BookmarkButton";
import { useLanguage } from "@/context/LanguageContext";
import { stateLabel } from "@/lib/i18n/options";
import type { Scheme } from "@/lib/types";

export default function SchemeCard({ scheme }: { scheme: Scheme }) {
  const { language, t } = useLanguage();
  const states = scheme.state?.length ? scheme.state.map((s) => stateLabel(s, language)) : null;

  return (
    <div className="relative h-full">
      <Link
        href={`/schemes/${encodeURIComponent(scheme.slug)}`}
        className="group flex h-full items-start gap-3 rounded-xl bg-surface p-4 pb-12 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-primary/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <Award size={20} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[15px] font-bold text-ink">
            {scheme.scheme_name}
          </span>
          {scheme.benefits_summary ? (
            <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-muted">
              {scheme.benefits_summary}
            </span>
          ) : null}
          <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
            <MapPin size={12} aria-hidden />
            <span className="truncate">{states ? states.join(", ") : t("central")}</span>
          </span>
        </span>
        <ChevronRight
          size={18}
          className="mt-1 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </Link>
      <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
        {scheme.verified === false ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <ShieldAlert size={11} aria-hidden />
            {t("unverifiedBadge")}
          </span>
        ) : null}
        <BookmarkButton scheme={scheme} />
      </div>
    </div>
  );
}
