"use client";

import {
  Award,
  ExternalLink,
  FileText,
  Gift,
  Info,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ErrorBox, Spinner, useErrorMessage } from "@/components/Feedback";
import { useLanguage } from "@/context/LanguageContext";
import { ApiError, getScheme } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import {
  GENDER_OPTIONS,
  labelFor,
  OCCUPATION_OPTIONS,
  RESIDENCY_OPTIONS,
  stateLabel,
} from "@/lib/i18n/options";
import EligibilityCard from "./EligibilityCard";
import EligibilityRequirements from "./EligibilityRequirements";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line sm:p-6">
      <h2 className="mb-3 flex items-center gap-2.5 text-base font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary">
          <Icon size={16} aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Only ever link to http(s) targets, whatever the API returns.
const safeUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : null);

export default function SchemeDetailView({ slug }: { slug: string }) {
  const { language, t } = useLanguage();
  const errorMessage = useErrorMessage();
  const schemeFetch = useFetch(`${slug}|${language}`, () => getScheme(slug, language));
  const scheme = schemeFetch.data;
  const fetchError = schemeFetch.error;
  const notFound = fetchError instanceof ApiError && fetchError.status === 404;
  const error = fetchError && !notFound ? errorMessage(fetchError) : undefined;
  const retry = schemeFetch.reload;

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-surface p-10 text-center ring-1 ring-line">
        <SearchX size={36} className="text-faint" aria-hidden />
        <p className="text-sm text-muted">{t("schemeNotFound")}</p>
        <Link
          href="/search"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("navSearch")}
        </Link>
      </div>
    );
  }
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!scheme) return <Spinner />;

  const link = safeUrl(scheme.application_link) ?? safeUrl(scheme.portal_url);
  // Schemes read from official websites (slug "web-…") list their rules in the
  // "Eligibility required" card instead of offering the profile check.
  const fromWeb = slug.startsWith("web-");
  const showConditions = !fromWeb && scheme.other_conditions.length > 0;

  // Header tags
  const tags: string[] = [];
  tags.push(
    scheme.state?.length
      ? scheme.state.map((s) => stateLabel(s, language)).join(", ")
      : t("central")
  );
  if (fromWeb) tags.push(t("fromOfficialSite"));
  if (scheme.category?.length) tags.push(...scheme.category.map((c) => c.toUpperCase()));
  if (scheme.occupation?.length)
    tags.push(...scheme.occupation.map((o) => labelFor(o.toLowerCase(), OCCUPATION_OPTIONS, language)));
  if (scheme.gender && ["male", "female"].includes(scheme.gender.toLowerCase()))
    tags.push(labelFor(scheme.gender.toLowerCase(), GENDER_OPTIONS, language));
  if (scheme.residency && ["rural", "urban"].includes(scheme.residency.toLowerCase()))
    tags.push(labelFor(scheme.residency.toLowerCase(), RESIDENCY_OPTIONS, language));
  if (scheme.age_min != null && scheme.age_max != null)
    tags.push(t("ageRange", { min: scheme.age_min, max: scheme.age_max }));
  else if (scheme.age_min != null) tags.push(t("ageFrom", { min: scheme.age_min }));
  else if (scheme.age_max != null) tags.push(t("ageUpTo", { max: scheme.age_max }));
  if (scheme.max_annual_income != null)
    tags.push(t("incomeLimit", { amount: scheme.max_annual_income.toLocaleString("en-IN") }));
  if (scheme.is_bpl_required) tags.push(t("bplOnly"));
  if (scheme.is_disabled_targeted) tags.push(t("disabilityTargeted"));

  const hasDetails =
    !!scheme.benefits_summary || showConditions || scheme.documents_required.length > 0;

  return (
    <article>
      <header className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-button sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
          <Award size={26} aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold leading-snug sm:text-3xl">
          {scheme.scheme_name}
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <li
              key={`${tag}-${i}`}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"
            >
              {tag}
            </li>
          ))}
        </ul>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {scheme.benefits_summary ? (
            <Section icon={Gift} title={t("benefits")}>
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {scheme.benefits_summary}
              </p>
            </Section>
          ) : null}

          {fromWeb ? <EligibilityRequirements scheme={scheme} /> : null}

          {showConditions ? (
            <Section icon={Info} title={t("conditions")}>
              <BulletList items={scheme.other_conditions} />
            </Section>
          ) : null}

          {scheme.documents_required.length > 0 ? (
            <Section icon={FileText} title={t("documentsRequired")}>
              <BulletList items={scheme.documents_required} />
            </Section>
          ) : null}

          {!hasDetails ? (
            <Section icon={Info} title={t("aboutScheme")}>
              <p className="text-sm text-muted">{t("noDetailsListed")}</p>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {!fromWeb ? (
            <EligibilityCard
              key={slug}
              slug={slug}
              hasUncheckableRules={scheme.other_conditions.length > 0}
            />
          ) : null}

          <div className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
            {link ? (
              <>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-dark"
                >
                  {t(fromWeb ? "openOfficialSource" : "openApplicationPage")}
                  <ExternalLink size={16} aria-hidden />
                </a>
                <p className="mt-2 text-center text-xs text-muted">
                  {t(fromWeb ? "officialSourceNote" : "applyNote")}
                </p>
              </>
            ) : (
              <p className="text-center text-sm text-muted">{t("noApplicationLink")}</p>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
