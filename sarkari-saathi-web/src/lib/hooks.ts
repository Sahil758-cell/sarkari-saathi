"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  HISTORY_STORAGE_KEY,
  PROFILES_STORAGE_KEY,
  parseProfiles,
  parseSearchHistory,
  readRaw,
  subscribeToStorage,
} from "./storage";
import type { SavedProfile, SearchHistoryEntry } from "./types";

// Server snapshot is `null` so components can tell "not read yet" (SSR and the
// hydration pass) apart from "read, and empty".
function useRawStorage(key: string): string | null {
  return useSyncExternalStore(
    subscribeToStorage,
    () => readRaw(key),
    () => null
  );
}

/** Saved profiles, kept live across tabs and across pages. `undefined` until
 *  localStorage has been read on the client. */
export function useSavedProfiles(): SavedProfile[] | undefined {
  const raw = useRawStorage(PROFILES_STORAGE_KEY);
  return useMemo(() => (raw === null ? undefined : parseProfiles(raw)), [raw]);
}

export function useSearchHistory(): SearchHistoryEntry[] {
  const raw = useRawStorage(HISTORY_STORAGE_KEY);
  return useMemo(() => (raw === null ? [] : parseSearchHistory(raw)), [raw]);
}

interface FetchState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs `fetcher` whenever `key` changes (or `reload()` is called) and exposes
 * the latest result. State is only set from the async callbacks, and a result
 * is only shown if it belongs to the current key, so stale responses and
 * "loading" resets need no synchronous setState in an effect.
 * Pass `enabled: false` to skip fetching (e.g. empty search box).
 */
export function useFetch<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  enabled = true
): FetchState<T> {
  const [nonce, setNonce] = useState(0);
  const [entry, setEntry] = useState<{ key: string; data?: T; error?: unknown }>();
  const fetcherRef = useRef(fetcher);
  const fullKey = `${key}#${nonce}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setEntry({ key: fullKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setEntry({ key: fullKey, error });
      });
    return () => controller.abort();
  }, [fullKey, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = enabled && entry?.key === fullKey ? entry : undefined;

  return {
    data: current?.data,
    error: current?.error,
    loading: enabled && !current,
    reload,
  };
}
