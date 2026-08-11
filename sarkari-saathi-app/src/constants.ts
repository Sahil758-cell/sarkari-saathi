import { Ionicons } from "@expo/vector-icons";
import { Language } from "./i18n/strings";
import {
  CATEGORY_OPTIONS as CATEGORY_OPTION_TUPLES,
  GENDER_OPTIONS as GENDER_OPTION_TUPLES,
  INCOME_OPTIONS as INCOME_OPTION_TUPLES,
  localizedOptions,
  localizedStates,
  OCCUPATION_OPTIONS as OCCUPATION_OPTION_TUPLES,
  RESIDENCY_OPTIONS as RESIDENCY_OPTION_TUPLES,
} from "./i18n/options";

// Language-aware option lists — value codes match what the backend's
// ProfileIn validates / matcher.py matches against; only the label changes
// with language. See src/i18n/options.ts (ported from bot/i18n.py) for the
// underlying (value, en, hi) data.

export function getStates(lang: Language): string[] {
  return localizedStates(lang);
}

export function getGenderOptions(lang: Language) {
  return localizedOptions(GENDER_OPTION_TUPLES, lang);
}

export function getCategoryOptions(lang: Language) {
  return localizedOptions(CATEGORY_OPTION_TUPLES, lang);
}

export function getIncomeOptions(lang: Language) {
  return localizedOptions(INCOME_OPTION_TUPLES, lang);
}

export function getResidencyOptions(lang: Language) {
  return localizedOptions(RESIDENCY_OPTION_TUPLES, lang);
}

export function getOccupationOptions(lang: Language) {
  return localizedOptions(OCCUPATION_OPTION_TUPLES, lang);
}

// Approximate categories used for the Home/Search "browse by category" UI —
// tapping one runs a keyword search against the existing /search endpoint,
// not a real structured category filter (schemes aren't tagged this way in
// the backend yet).
export const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "education", label: "Education", icon: "school-outline" },
  { key: "employment", label: "Employment", icon: "briefcase-outline" },
  { key: "housing", label: "Housing", icon: "home-outline" },
  { key: "agriculture", label: "Agriculture", icon: "leaf-outline" },
  { key: "women", label: "Women", icon: "heart-outline" },
  { key: "health", label: "Health", icon: "medkit-outline" },
];

export const POPULAR_SEARCHES: string[] = [
  "PM Kisan",
  "Ladki Bahin",
  "PMAY",
  "Farmer",
  "Pension",
  "Scholarship",
];

export const EXAMPLE_QUESTIONS: string[] = [
  "Which schemes are for students?",
  "What farmer loans are available?",
  "What schemes help women?",
  "Is there a pension scheme after 60?",
];
