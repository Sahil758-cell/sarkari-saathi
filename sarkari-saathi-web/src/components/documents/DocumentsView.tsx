"use client";

import { FileText } from "lucide-react";
import { PageHeading } from "@/components/Feedback";
import { useLanguage } from "@/context/LanguageContext";
import { COMMON_DOCUMENTS } from "@/lib/constants";

export default function DocumentsView() {
  const { t } = useLanguage();
  return (
    <>
      <PageHeading title={t("documents")} subtitle={t("documentsIntro")} />
      <ul className="grid gap-3 md:grid-cols-2">
        {COMMON_DOCUMENTS.map((doc) => (
          <li
            key={doc.title}
            className="flex gap-4 rounded-xl bg-surface p-4 shadow-card ring-1 ring-line"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
              <FileText size={20} aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold">{t(doc.title)}</h2>
              <p className="mt-0.5 text-sm text-muted">{t(doc.detail)}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
