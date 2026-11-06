"use client";

import { useEffect } from "react";

/** Registers the offline service worker (production builds only — in `next dev`
 *  a service worker would keep serving stale files). */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is optional */
    });
  }, []);
  return null;
}
