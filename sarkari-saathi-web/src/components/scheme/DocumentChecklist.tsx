"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useChecked } from "@/lib/hooks";
import { toggleChecked } from "@/lib/storage";

/** The documents a scheme asks for, as a tick-list that is remembered in this
 *  browser — so people know what they still have to arrange. */
export default function DocumentChecklist({
  slug,
  documents,
}: {
  slug: string;
  documents: string[];
}) {
  const { t } = useLanguage();
  const checked = useChecked(slug);
  const done = documents.filter((d) => checked.includes(d)).length;

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        {t("checklistHint")} ·{" "}
        <span className="font-semibold text-primary">
          {t("checklistProgress", { done, total: documents.length })}
        </span>
      </p>
      <ul className="space-y-2">
        {documents.map((doc) => {
          const isDone = checked.includes(doc);
          return (
            <li key={doc}>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleChecked(slug, doc)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line bg-surface text-white peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary"
                >
                  {isDone ? <Check size={14} /> : null}
                </span>
                <span className={isDone ? "text-muted line-through" : ""}>{doc}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
