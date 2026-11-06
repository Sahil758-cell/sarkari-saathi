// Option label translations — ported from bot/i18n.py (already had these,
// human-quality, used by the Telegram bot). Value codes are the canonical
// strings the backend's ProfileIn validates / matcher.py matches against —
// only the display label changes with language, never the value.
import { Language } from "./strings";

type OptionTuple = [value: string, en: string, hi: string];

export const GENDER_OPTIONS: OptionTuple[] = [
  ["male", "Male", "पुरुष"],
  ["female", "Female", "महिला"],
];

export const CATEGORY_OPTIONS: OptionTuple[] = [
  ["general", "General", "सामान्य"],
  ["sc", "SC", "अनुसूचित जाति (SC)"],
  ["st", "ST", "अनुसूचित जनजाति (ST)"],
  ["obc", "OBC", "अन्य पिछड़ा वर्ग (OBC)"],
  ["ews", "EWS", "EWS"],
];

export const INCOME_OPTIONS: OptionTuple[] = [
  ["below_1l", "Below ₹1 Lakh", "₹1 लाख से कम"],
  ["1_2l", "₹1-2 Lakh", "₹1-2 लाख"],
  ["2_5l", "₹2-5 Lakh", "₹2-5 लाख"],
  ["5_8l", "₹5-8 Lakh", "₹5-8 लाख"],
  ["above_8l", "Above ₹8 Lakh", "₹8 लाख से अधिक"],
];

export const RESIDENCY_OPTIONS: OptionTuple[] = [
  ["rural", "Rural", "ग्रामीण"],
  ["urban", "Urban", "शहरी"],
];

// Values lowercased to match bot/i18n.py's codes — safe change from the
// previous capitalized-string-as-value scheme since matcher.py's occupation
// comparison is already case-insensitive on both sides.
export const OCCUPATION_OPTIONS: OptionTuple[] = [
  ["farmer", "Farmer", "किसान"],
  ["fisherman", "Fisherman", "मछुआरा"],
  ["student", "Student", "छात्र"],
  ["entrepreneur", "Entrepreneur", "उद्यमी"],
  ["laborer", "Laborer/Worker", "मजदूर"],
  ["artisan", "Artisan", "कारीगर"],
  ["unemployed", "Unemployed", "बेरोजगार"],
];

// (canonical English state name used as the actual profile value, Hindi label)
export const STATES: [string, string][] = [
  ["Andhra Pradesh", "आंध्र प्रदेश"],
  ["Arunachal Pradesh", "अरुणाचल प्रदेश"],
  ["Assam", "असम"],
  ["Bihar", "बिहार"],
  ["Chhattisgarh", "छत्तीसगढ़"],
  ["Goa", "गोवा"],
  ["Gujarat", "गुजरात"],
  ["Haryana", "हरियाणा"],
  ["Himachal Pradesh", "हिमाचल प्रदेश"],
  ["Jharkhand", "झारखंड"],
  ["Karnataka", "कर्नाटक"],
  ["Kerala", "केरल"],
  ["Madhya Pradesh", "मध्य प्रदेश"],
  ["Maharashtra", "महाराष्ट्र"],
  ["Manipur", "मणिपुर"],
  ["Meghalaya", "मेघालय"],
  ["Mizoram", "मिज़ोरम"],
  ["Nagaland", "नागालैंड"],
  ["Odisha", "ओडिशा"],
  ["Punjab", "पंजाब"],
  ["Rajasthan", "राजस्थान"],
  ["Sikkim", "सिक्किम"],
  ["Tamil Nadu", "तमिलनाडु"],
  ["Telangana", "तेलंगाना"],
  ["Tripura", "त्रिपुरा"],
  ["Uttar Pradesh", "उत्तर प्रदेश"],
  ["Uttarakhand", "उत्तराखंड"],
  ["West Bengal", "पश्चिम बंगाल"],
  ["Andaman and Nicobar Islands", "अंडमान और निकोबार द्वीप समूह"],
  ["Chandigarh", "चंडीगढ़"],
  ["Dadra and Nagar Haveli and Daman and Diu", "दादरा और नगर हवेली तथा दमन और दीव"],
  ["Delhi", "दिल्ली"],
  ["Jammu and Kashmir", "जम्मू और कश्मीर"],
  ["Ladakh", "लद्दाख"],
  ["Lakshadweep", "लक्षद्वीप"],
  ["Puducherry", "पुदुचेरी"],
];

export function labelFor(value: string | undefined, options: OptionTuple[], lang: Language): string {
  if (!value) return value ?? "";
  const opt = options.find((o) => o[0] === value);
  if (!opt) return value;
  return lang === "en" ? opt[1] : opt[2];
}

export function stateLabel(englishName: string | undefined, lang: Language): string {
  if (!englishName) return englishName ?? "";
  if (lang === "en") return englishName;
  const found = STATES.find(([en]) => en === englishName);
  return found ? found[1] : englishName;
}

export function localizedOptions(
  options: OptionTuple[],
  lang: Language
): { value: string; label: string }[] {
  return options.map(([value, en, hi]) => ({ value, label: lang === "en" ? en : hi }));
}

