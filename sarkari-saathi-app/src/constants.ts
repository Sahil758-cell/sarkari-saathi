import { Ionicons } from "@expo/vector-icons";

// Copied from bot/i18n.py — the option vocabularies matcher.py expects.
// Category/income/residency/gender codes must stay lowercase exactly as
// listed here; the backend's ProfileIn validates against these same values.

export const STATES: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const GENDER_OPTIONS: { value: "male" | "female"; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const CATEGORY_OPTIONS: {
  value: "general" | "sc" | "st" | "obc" | "ews";
  label: string;
}[] = [
  { value: "general", label: "General" },
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
  { value: "obc", label: "OBC" },
  { value: "ews", label: "EWS" },
];

export const INCOME_OPTIONS: {
  value: "below_1l" | "1_2l" | "2_5l" | "5_8l" | "above_8l";
  label: string;
}[] = [
  { value: "below_1l", label: "Below ₹1 Lakh" },
  { value: "1_2l", label: "₹1-2 Lakh" },
  { value: "2_5l", label: "₹2-5 Lakh" },
  { value: "5_8l", label: "₹5-8 Lakh" },
  { value: "above_8l", label: "Above ₹8 Lakh" },
];

export const RESIDENCY_OPTIONS: { value: "rural" | "urban"; label: string }[] = [
  { value: "rural", label: "Rural" },
  { value: "urban", label: "Urban" },
];

export const OCCUPATION_OPTIONS: string[] = [
  "Farmer",
  "Fisherman",
  "Student",
  "Entrepreneur",
  "Laborer/Worker",
  "Artisan",
  "Unemployed",
];

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
