"use client";

import { ChevronRight, UserRound, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EmptyState, PageHeading, Spinner } from "@/components/Feedback";
import { useLanguage } from "@/context/LanguageContext";
import { useSavedProfiles } from "@/lib/hooks";
import { GENDER_OPTIONS, labelFor, stateLabel } from "@/lib/i18n/options";
import { profileToQuery } from "@/lib/profileQuery";

/** "Schemes for me": jump straight to the matches for the saved profile, so the
 *  eligibility questions only ever have to be answered once. */
export default function ForYouView() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const profiles = useSavedProfiles();

  const only = profiles?.length === 1 ? profiles[0] : undefined;
  useEffect(() => {
    if (only) router.replace(`/results?${profileToQuery(only.profile)}`);
  }, [only, router]);

  if (!profiles || only) return <Spinner />;

  if (profiles.length === 0) {
    return (
      <>
        <PageHeading title={t("forYouTitle")} subtitle={t("forYouSubtitle")} />
        <EmptyState icon={UserRoundPlus} message={t("forYouNone")}>
          <Link
            href="/check"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("createProfile")}
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeading title={t("forYouTitle")} subtitle={t("forYouPick")} />
      <ul className="grid gap-3 md:grid-cols-2">
        {profiles.map((p) => (
          <li key={p.id}>
            <Link
              href={`/results?${profileToQuery(p.profile)}`}
              className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-primary/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                <UserRound size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="block truncate text-sm text-muted">
                  {`${p.profile.age}, ${labelFor(p.profile.gender, GENDER_OPTIONS, language)}, ${stateLabel(p.profile.state, language)}`}
                </span>
              </span>
              <ChevronRight size={18} className="text-faint" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
