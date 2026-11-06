"use client";

import { Languages, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { StringKey } from "@/lib/i18n/strings";

const LINKS: { href: string; label: StringKey }[] = [
  { href: "/", label: "navHome" },
  { href: "/search", label: "navSearch" },
  { href: "/assistant", label: "navAskAi" },
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
  const setOpen = (fn: (o: boolean) => boolean) => setOpenFor(fn(open) ? pathname : null);

  const toggleLanguage = () => setLanguage(language === "en" ? "hi" : "en");

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
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t("switchLanguage")}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light"
          >
            <Languages size={16} aria-hidden />
            {language === "en" ? "हिंदी" : "English"}
          </button>
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
