"use client";

import { Check, Copy, Flag, MessageCircle, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import BookmarkButton from "@/components/BookmarkButton";
import { useLanguage } from "@/context/LanguageContext";
import type { Scheme } from "@/lib/types";
import ReportDialog from "./ReportDialog";

const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/50 hover:bg-primary-light";

/** Save, share, print, ask-AI and report buttons for one scheme. */
export default function SchemeActions({ scheme }: { scheme: Scheme }) {
  const { t } = useLanguage();
  const [reporting, setReporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Read at click time — the page URL only exists in the browser.
  const pageUrl = () => window.location.href;

  function shareOnWhatsApp() {
    const lines = [scheme.scheme_name];
    if (scheme.benefits_summary) lines.push(scheme.benefits_summary);
    if (scheme.documents_required.length > 0) {
      lines.push(`${t("documentsRequired")}: ${scheme.documents_required.join(", ")}`);
    }
    lines.push(pageUrl());
    window.open(
      `https://wa.me/?text=${encodeURIComponent(lines.join("\n\n"))}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — nothing useful to do */
    }
  }

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        <BookmarkButton scheme={scheme} variant="full" />
        <button type="button" onClick={shareOnWhatsApp} className={buttonClass}>
          <MessageCircle size={16} aria-hidden />
          {t("shareWhatsapp")}
        </button>
        <button type="button" onClick={copyLink} className={buttonClass}>
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied ? t("linkCopied") : t("copyLink")}
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass}>
          <Printer size={16} aria-hidden />
          {t("printPage")}
        </button>
        <Link
          href={`/assistant?q=${encodeURIComponent(scheme.scheme_name)}`}
          className={buttonClass}
        >
          <Sparkles size={16} aria-hidden />
          {t("askAiAboutThis")}
        </Link>
        <button type="button" onClick={() => setReporting(true)} className={buttonClass}>
          <Flag size={16} aria-hidden />
          {t("reportProblem")}
        </button>
      </div>
      {reporting ? <ReportDialog slug={scheme.slug} onClose={() => setReporting(false)} /> : null}
    </>
  );
}
