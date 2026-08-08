import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sarkari-saathi:search-history";
const MAX_ENTRIES = 10;

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

async function readAll(): Promise<SearchHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SearchHistoryEntry[]) : [];
}

export async function listSearchHistory(): Promise<SearchHistoryEntry[]> {
  return readAll();
}

export async function addSearchHistory(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const all = await readAll();
  const deduped = all.filter((e) => e.query.toLowerCase() !== trimmed.toLowerCase());
  const updated = [{ query: trimmed, timestamp: Date.now() }, ...deduped].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function relativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
