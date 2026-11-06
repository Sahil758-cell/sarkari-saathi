// localStorage-backed persistence. Same keys, shapes and limits as the mobile
// app's AsyncStorage layer (storage/profiles.ts, storage/searchHistory.ts,
// storage/language.ts). Every access is wrapped because localStorage can be
// missing or throw (private mode, blocked site data, SSR).

import { MAX_SAVED_PROFILES } from "./constants";
import { GENDER_OPTIONS, labelFor } from "./i18n/options";
import type { Language } from "./i18n/strings";
import type { Profile, SavedProfile, SearchHistoryEntry } from "./types";

const PROFILES_KEY = "sarkari-saathi:profiles";
const HISTORY_KEY = "sarkari-saathi:search-history";
const LANGUAGE_KEY = "sarkari-saathi:language";
const MAX_HISTORY = 10;

// Same-tab writes don't fire the browser's `storage` event, so every write
// also dispatches this one; useSyncExternalStore subscribers listen to both.
const CHANGE_EVENT = "sarkari-saathi:storage";

export function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Raw stored string ("" when absent or storage is unavailable). Stable between
 *  calls while nothing changed, which useSyncExternalStore requires. */
export function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function parse<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function read<T>(key: string, fallback: T): T {
  return parse(readRaw(key), fallback);
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — fail silently, UI still works for the session */
  }
  notify();
}

export const PROFILES_STORAGE_KEY = PROFILES_KEY;
export const HISTORY_STORAGE_KEY = HISTORY_KEY;
export const LANGUAGE_STORAGE_KEY = LANGUAGE_KEY;

export function parseProfiles(raw: string): SavedProfile[] {
  return parse<SavedProfile[]>(raw, []);
}

export function parseSearchHistory(raw: string): SearchHistoryEntry[] {
  return parse<SearchHistoryEntry[]>(raw, []);
}

// ---- Language ----

// Kept in memory too, so the toggle still works when localStorage is blocked.
let memoryLanguage: Language | null = null;

export function loadLanguage(): Language | null {
  const v = readRaw(LANGUAGE_KEY);
  if (v === "en" || v === "hi" || v === "mr") return v;
  return memoryLanguage;
}

export function saveLanguage(lang: Language): void {
  memoryLanguage = lang;
  try {
    window.localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  notify();
}

// ---- Saved profiles ----

// Computed once at save time (English), like the mobile app.
function labelForProfile(profile: Profile): string {
  return `${profile.age}, ${labelFor(profile.gender, GENDER_OPTIONS, "en")}, ${profile.state}`;
}

export function listProfiles(): SavedProfile[] {
  return read<SavedProfile[]>(PROFILES_KEY, []);
}

export function getProfile(id: string): SavedProfile | null {
  return listProfiles().find((p) => p.id === id) ?? null;
}

export function saveProfile(profile: Profile, name: string, id?: string): SavedProfile {
  const all = listProfiles();
  const label = labelForProfile(profile);

  if (id) {
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Profile not found");
    const updated: SavedProfile = { id, name, label, profile };
    all[index] = updated;
    write(PROFILES_KEY, all);
    return updated;
  }

  if (all.length >= MAX_SAVED_PROFILES) {
    throw new Error(`You can only save up to ${MAX_SAVED_PROFILES} profiles`);
  }
  const created: SavedProfile = { id: String(Date.now()), name, label, profile };
  write(PROFILES_KEY, [...all, created]);
  return created;
}

export function deleteProfile(id: string): void {
  write(
    PROFILES_KEY,
    listProfiles().filter((p) => p.id !== id)
  );
}

// ---- Search history ----

export function listSearchHistory(): SearchHistoryEntry[] {
  return read<SearchHistoryEntry[]>(HISTORY_KEY, []);
}

export function addSearchHistory(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const deduped = listSearchHistory().filter(
    (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
  );
  write(HISTORY_KEY, [{ query: trimmed, timestamp: Date.now() }, ...deduped].slice(0, MAX_HISTORY));
}

export function clearSearchHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

// ---- Bookmarked schemes ----

const BOOKMARKS_KEY = "sarkari-saathi:bookmarks";
const CHECKLIST_KEY = "sarkari-saathi:checklist";
const NEW_SEEN_KEY = "sarkari-saathi:new-seen";
const MAX_BOOKMARKS = 50;

export const BOOKMARKS_STORAGE_KEY = BOOKMARKS_KEY;
export const CHECKLIST_STORAGE_KEY = CHECKLIST_KEY;
export const NEW_SEEN_STORAGE_KEY = NEW_SEEN_KEY;

export interface Bookmark {
  slug: string;
  name: string;
  state: string[] | null;
  savedAt: number;
}

export function parseBookmarks(raw: string): Bookmark[] {
  return parse<Bookmark[]>(raw, []);
}

export function listBookmarks(): Bookmark[] {
  return read<Bookmark[]>(BOOKMARKS_KEY, []);
}

/** Adds the scheme if it isn't bookmarked, removes it if it is. Returns the new state. */
export function toggleBookmark(scheme: {
  slug: string;
  scheme_name: string;
  state: string[] | null;
}): boolean {
  const all = listBookmarks();
  if (all.some((b) => b.slug === scheme.slug)) {
    write(
      BOOKMARKS_KEY,
      all.filter((b) => b.slug !== scheme.slug)
    );
    return false;
  }
  const added: Bookmark = {
    slug: scheme.slug,
    name: scheme.scheme_name,
    state: scheme.state,
    savedAt: Date.now(),
  };
  write(BOOKMARKS_KEY, [added, ...all].slice(0, MAX_BOOKMARKS));
  return true;
}

export function removeBookmark(slug: string): void {
  write(
    BOOKMARKS_KEY,
    listBookmarks().filter((b) => b.slug !== slug)
  );
}

// ---- Document checklist (documents the user has already got, per scheme) ----

export type Checklist = Record<string, string[]>;

export function parseChecklist(raw: string): Checklist {
  return parse<Checklist>(raw, {});
}

export function toggleChecked(slug: string, document: string): void {
  const all = read<Checklist>(CHECKLIST_KEY, {});
  const current = all[slug] ?? [];
  all[slug] = current.includes(document)
    ? current.filter((d) => d !== document)
    : [...current, document];
  write(CHECKLIST_KEY, all);
}

// ---- "New schemes" — the newest scheme date the user has already looked at ----

export function markNewSeen(newestDate: string): void {
  try {
    window.localStorage.setItem(NEW_SEEN_KEY, newestDate);
  } catch {
    /* ignore */
  }
  notify();
}
