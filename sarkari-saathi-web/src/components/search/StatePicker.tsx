"use client";

import { useLanguage } from "@/context/LanguageContext";
import { stateLabel } from "@/lib/i18n/options";

// The states people search most; every state also works if typed in the box.
const COMMON_STATES = [
  "Maharashtra",
  "Uttar Pradesh",
  "Bihar",
  "Madhya Pradesh",
  "Rajasthan",
  "Gujarat",
  "West Bengal",
  "Tamil Nadu",
  "Karnataka",
  "Odisha",
  "Kerala",
  "Telangana",
];

/** A scheme name is often shared by several states. After a live result, let the
 *  user add their state to the search to get that state's version. */
export default function StatePicker({
  query,
  onPick,
}: {
  query: string;
  onPick: (query: string) => void;
}) {
  const { language, t } = useLanguage();
  const lower = query.toLowerCase();
  const states = COMMON_STATES.filter((s) => !lower.includes(s.toLowerCase()));
  // Already narrowed to a state (any of the listed ones) → nothing to suggest.
  if (states.length < COMMON_STATES.length) return null;

  return (
    <div className="mt-6 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <p className="text-sm font-semibold">{t("otherStateTitle")}</p>
      <p className="mb-3 text-xs text-muted">{t("otherStateHint")}</p>
      <div className="flex flex-wrap gap-2">
        {states.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(`${query} ${s}`)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary-light"
          >
            {stateLabel(s, language)}
          </button>
        ))}
      </div>
    </div>
  );
}
