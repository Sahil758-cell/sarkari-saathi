import {
  BriefcaseBusiness,
  GraduationCap,
  HeartHandshake,
  Home,
  Leaf,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import {
  CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  INCOME_OPTIONS,
  localizedOptions,
  OCCUPATION_OPTIONS,
  RESIDENCY_OPTIONS,
} from "./i18n/options";
import type { Language, StringKey } from "./i18n/strings";

// Language-aware option lists — value codes match what the backend validates;
// only the label changes with language.
export const getGenderOptions = (lang: Language) => localizedOptions(GENDER_OPTIONS, lang);
export const getCategoryOptions = (lang: Language) => localizedOptions(CATEGORY_OPTIONS, lang);
export const getIncomeOptions = (lang: Language) => localizedOptions(INCOME_OPTIONS, lang);
export const getResidencyOptions = (lang: Language) => localizedOptions(RESIDENCY_OPTIONS, lang);
export const getOccupationOptions = (lang: Language) => localizedOptions(OCCUPATION_OPTIONS, lang);

// Approximate "browse by category" tiles — tapping one runs a keyword search
// (`label` is the query sent to /search), not a real structured filter.
export const CATEGORIES: { key: string; label: string; labelKey: StringKey; icon: LucideIcon }[] = [
  { key: "education", label: "Education", labelKey: "catEducation", icon: GraduationCap },
  { key: "employment", label: "Employment", labelKey: "catEmployment", icon: BriefcaseBusiness },
  { key: "housing", label: "Housing", labelKey: "catHousing", icon: Home },
  { key: "agriculture", label: "Agriculture", labelKey: "catAgriculture", icon: Leaf },
  { key: "women", label: "Women", labelKey: "catWomen", icon: HeartHandshake },
  { key: "health", label: "Health", labelKey: "catHealth", icon: Stethoscope },
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

export const MAX_SAVED_PROFILES = 4;

// The 5 wizard steps, shared by the Home card and the /check sidebar.
export const WIZARD_STEPS: { title: StringKey; desc: StringKey }[] = [
  { title: "personalDetails", desc: "personalDetailsDesc" },
  { title: "location", desc: "locationDesc" },
  { title: "categoryIncome", desc: "categoryIncomeDesc" },
  { title: "additionalInfo", desc: "additionalInfoDesc" },
  { title: "review", desc: "reviewDesc" },
];

export const COMMON_DOCUMENTS: { title: StringKey; detail: StringKey }[] = [
  { title: "docAadhaarTitle", detail: "docAadhaarDetail" },
  { title: "docIncomeTitle", detail: "docIncomeDetail" },
  { title: "docCasteTitle", detail: "docCasteDetail" },
  { title: "docDomicileTitle", detail: "docDomicileDetail" },
  { title: "docBankTitle", detail: "docBankDetail" },
  { title: "docPhotoTitle", detail: "docPhotoDetail" },
  { title: "docBplTitle", detail: "docBplDetail" },
  { title: "docDisabilityTitle", detail: "docDisabilityDetail" },
];
