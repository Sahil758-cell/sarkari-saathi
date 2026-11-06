"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { StringKey } from "@/lib/i18n/strings";

// Looking a scheme up on official websites can take up to a minute or two
// (the free server may also be waking up) — say what is happening meanwhile.
const STEPS: { fromSeconds: number; text: StringKey }[] = [
  { fromSeconds: 0, text: "liveStep1" },
  { fromSeconds: 8, text: "liveStep2" },
  { fromSeconds: 25, text: "liveStep3" },
  { fromSeconds: 50, text: "liveStep4" },
];

export default function LiveProgress() {
  const { t } = useLanguage();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const step = [...STEPS].reverse().find((s) => seconds >= s.fromSeconds) ?? STEPS[0];
  const percent = Math.min(92, Math.round(100 * (1 - Math.exp(-seconds / 35))));

  return (
    <div role="status" className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <Loader2 className="animate-spin text-primary" size={28} aria-hidden />
      <p className="text-sm font-semibold text-ink">{t("searchingOfficialSites")}</p>
      <p className="text-sm text-muted">{t(step.text)}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
