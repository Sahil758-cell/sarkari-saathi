"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE_URL } from "@/lib/api";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-16 bg-primary-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11" />
            <span className="text-lg font-bold">{t("appName")}</span>
          </div>
          <p className="mt-3 max-w-md text-sm text-white/80">{t("footerTagline")}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            {t("explore")}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <li><Link className="text-white/90 hover:underline" href="/check">{t("findMySchemes")}</Link></li>
            <li><Link className="text-white/90 hover:underline" href="/search">{t("navSearch")}</Link></li>
            <li><Link className="text-white/90 hover:underline" href="/assistant">{t("navAskAi")}</Link></li>
            <li><Link className="text-white/90 hover:underline" href="/documents">{t("navDocuments")}</Link></li>
            <li><Link className="text-white/90 hover:underline" href="/saved">{t("navSaved")}</Link></li>
            {API_BASE_URL ? (
              <li>
                <a
                  className="text-white/90 hover:underline"
                  href={`${API_BASE_URL}/privacy-policy`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("privacyPolicy")}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/60 sm:px-6">
          {t("footerDisclaimer")}
        </p>
      </div>
    </footer>
  );
}
