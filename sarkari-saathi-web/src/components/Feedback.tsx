"use client";

import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api";

export function Spinner({ label }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted">
      <Loader2 className="animate-spin text-primary" size={24} aria-hidden />
      <span className="text-sm">{label ?? t("loading")}</span>
    </div>
  );
}

/** Maps any thrown value to a friendly, translated message. */
export function useErrorMessage() {
  const { t } = useLanguage();
  return (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 0) return t("couldNotReachServer");
      if (err.status === 429) return t("assistantBusy");
    }
    return t("somethingWentWrong");
  };
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl bg-danger-light p-6 text-center text-danger"
    >
      <AlertCircle size={28} aria-hidden />
      <p className="text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-danger/30 bg-surface px-4 py-1.5 text-sm font-semibold text-danger hover:bg-danger-light"
        >
          {t("tryAgain")}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  message,
  children,
}: {
  icon: LucideIcon;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-surface p-10 text-center ring-1 ring-line">
      <Icon size={36} className="text-faint" aria-hidden />
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {children}
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">{subtitle}</p> : null}
    </div>
  );
}
