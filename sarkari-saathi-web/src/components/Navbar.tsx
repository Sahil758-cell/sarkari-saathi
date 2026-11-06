"use client";

import { Languages, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getLatestSchemes } from "@/lib/api";
import { useFetch, useNewSeen } from "@/lib/hooks";
import { markNewSeen } from "@/lib/storage";
import { LANGUAGES, type StringKey } from "@/lib/i18n/strings";

const LINKS: { href: string; label: StringKey }[] = [
  { href: "/", label: "navHome" },
  { href: "/search", label: "navSearch" },
  { href: "/assistant", label: "navAskAi" },
  { href: "/new", label: "navNew" },
  { href: "/documents", label: "navDocuments" },
  { href: "/saved", label: "navSaved" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  // The menu is "open for" a specific path, so navigating away closes it
  // without needing an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  // A dot on "New" when schemes were added since the user last opened that page.
  // The very first visit just records the newest scheme (nothing is "new" yet).
  const newest = useFetch("nav-newest", () => getLatestSchemes(1, "en")).data?.results[0]?.date_added;
  const seen = useNewSeen();
  useEffect(() => {
    if (newest && !seen) markNewSeen(newest);
  }, [newest, seen]);
  const hasNew = !!newest && !!seen && newest > seen;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenFor(fn(open) ? pathname : null);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={t("appName")}>
          <Image src="/logo.png" alt="" width={44} height={44} priority className="h-11 w-11" />
          <span className="text-base font-bold text-primary-dark sm:text-lg">{t("appName")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-light text-primary"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {t(l.label)}
                {l.href === "/new" && hasNew && !active ? (
                  <span aria-label={t("newBadge")} className="ml-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={t("switchLanguage")}
            className="flex items-center rounded-full border border-line bg-surface p-0.5"
          >
            <Languages size={15} className="mx-1.5 hidden text-faint sm:block" aria-hidden />
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                lang={l.code}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:text-sm ${
                  language === l.code
                    ? "bg-primary text-white"
                    : "text-primary hover:bg-primary-light"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-canvas md:hidden"
          >
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-line bg-surface px-4 py-2 md:hidden"
        >
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-3 text-sm font-medium ${
                  active ? "bg-primary-light text-primary" : "text-ink hover:bg-canvas"
                }`}
              >
                {t(l.label)}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
