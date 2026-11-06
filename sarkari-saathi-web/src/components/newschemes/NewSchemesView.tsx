"use client";

import { useEffect } from "react";
import { ErrorBox, PageHeading, Spinner, useErrorMessage } from "@/components/Feedback";
import SchemeCard from "@/components/SchemeCard";
import { useLanguage } from "@/context/LanguageContext";
import { getLatestSchemes } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { markNewSeen } from "@/lib/storage";

/** The most recently added schemes. Opening it clears the "new" dot in the menu. */
export default function NewSchemesView() {
  const { language, t } = useLanguage();
  const errorMessage = useErrorMessage();
  const fetched = useFetch(`new:${language}`, () => getLatestSchemes(30, language));
  const schemes = fetched.data?.results;

  // Remember what has been looked at, so the "new" dot in the menu goes away.
  const newest = schemes?.[0]?.date_added;
  useEffect(() => {
    if (newest) markNewSeen(newest);
  }, [newest]);

  if (fetched.error) {
    return <ErrorBox message={errorMessage(fetched.error)} onRetry={fetched.reload} />;
  }
  if (!schemes) return <Spinner />;

  return (
    <>
      <PageHeading title={t("newTitle")} subtitle={t("newSubtitle")} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {schemes.map((s) => (
          <SchemeCard key={s.slug} scheme={s} />
        ))}
      </div>
    </>
  );
}
