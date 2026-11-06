"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmptyState, ErrorBox, PageHeading, Spinner, useErrorMessage } from "@/components/Feedback";
import { useLanguage } from "@/context/LanguageContext";
import { getScheme } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { stateLabel } from "@/lib/i18n/options";
import type { StringKey } from "@/lib/i18n/strings";
import type { Scheme } from "@/lib/types";

const MAX_COMPARE = 3;

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span className="text-faint">{empty}</span>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CompareView() {
  const { language, t } = useLanguage();
  const errorMessage = useErrorMessage();
  const slugs = (useSearchParams().get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  const fetched = useFetch(
    `compare:${slugs.join("|")}|${language}`,
    () => Promise.all(slugs.map((slug) => getScheme(slug, language))),
    slugs.length >= 2
  );

  if (slugs.length < 2) {
    return (
      <EmptyState icon={SearchX} message={t("compareNeedTwo")}>
        <Link
          href="/saved"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("navSaved")}
        </Link>
      </EmptyState>
    );
  }
  if (fetched.error) return <ErrorBox message={errorMessage(fetched.error)} onRetry={fetched.reload} />;
  if (!fetched.data) return <Spinner />;

  const schemes: Scheme[] = fetched.data;
  const none = t("compareNoData");

  const rows: { label: StringKey; render: (s: Scheme) => React.ReactNode }[] = [
    {
      label: "compareState",
      render: (s) =>
        s.state?.length ? s.state.map((x) => stateLabel(x, language)).join(", ") : t("central"),
    },
    { label: "compareBenefits", render: (s) => s.benefits_summary ?? none },
    {
      label: "compareAge",
      render: (s) =>
        s.age_min != null && s.age_max != null
          ? t("ageRange", { min: s.age_min, max: s.age_max })
          : s.age_min != null
            ? t("ageFrom", { min: s.age_min })
            : s.age_max != null
              ? t("ageUpTo", { max: s.age_max })
              : none,
    },
    {
      label: "compareIncome",
      render: (s) =>
        s.max_annual_income != null
          ? t("incomeLimit", { amount: s.max_annual_income.toLocaleString("en-IN") })
          : none,
    },
    {
      label: "compareCategory",
      render: (s) => (s.category?.length ? s.category.map((c) => c.toUpperCase()).join(", ") : none),
    },
    { label: "compareConditions", render: (s) => <List items={s.other_conditions} empty={none} /> },
    { label: "compareDocuments", render: (s) => <List items={s.documents_required} empty={none} /> },
  ];

  return (
    <>
      <Link
        href="/saved"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden />
        {t("navSaved")}
      </Link>
      <PageHeading title={t("compareTitle")} />

      <div className="overflow-x-auto rounded-2xl bg-surface shadow-card ring-1 ring-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-primary-light align-top">
              <th scope="col" className="w-32 p-4" />
              {schemes.map((s) => (
                <th key={s.slug} scope="col" className="p-4 text-base font-bold">
                  <Link href={`/schemes/${encodeURIComponent(s.slug)}`} className="hover:underline">
                    {s.scheme_name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line align-top last:border-b-0">
                <th scope="row" className="p-4 text-xs font-bold uppercase tracking-wide text-muted">
                  {t(row.label)}
                </th>
                {schemes.map((s) => (
                  <td key={s.slug} className="p-4 leading-relaxed">
                    {row.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
