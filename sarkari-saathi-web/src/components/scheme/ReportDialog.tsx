"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { reportScheme, type ReportReason } from "@/lib/api";
import type { StringKey } from "@/lib/i18n/strings";

const REASONS: { value: ReportReason; label: StringKey }[] = [
  { value: "wrong_info", label: "reasonWrong" },
  { value: "outdated", label: "reasonOutdated" },
  { value: "broken_link", label: "reasonBroken" },
  { value: "other", label: "reasonOther" },
];

export default function ReportDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState<ReportReason>("wrong_info");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await reportScheme(slug, reason, note.trim());
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-card ring-1 ring-line"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="report-title" className="text-lg font-bold">
            {t("reportTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-canvas"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {status === "sent" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("reportThanks")}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted">{t("reportIntro")}</p>
            <fieldset className="space-y-2">
              {REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-[var(--color-primary)]"
                  />
                  {t(r.label)}
                </label>
              ))}
            </fieldset>
            <label className="block">
              <span className="sr-only">{t("reportNotePlaceholder")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t("reportNotePlaceholder")}
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm placeholder:text-faint focus:border-primary"
              />
            </label>
            {status === "failed" ? (
              <p role="alert" className="text-sm text-danger">
                {t("reportFailed")}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line px-5 py-2 text-sm font-semibold hover:bg-canvas"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {status === "sending" ? t("reportSending") : t("reportSend")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
