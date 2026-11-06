import type { Profile } from "./types";

// The /results page reads the profile from the URL so a refresh (or a shared
// link) keeps working. These helpers convert both ways and validate the same
// way the backend's ProfileIn does.

const GENDERS = ["male", "female"];
const CATEGORIES = ["general", "sc", "st", "obc", "ews"];
const INCOMES = ["below_1l", "1_2l", "2_5l", "5_8l", "above_8l"];
const RESIDENCIES = ["rural", "urban"];

export function profileToQuery(profile: Profile): string {
  const p = new URLSearchParams();
  p.set("age", String(profile.age));
  p.set("gender", profile.gender);
  p.set("state", profile.state);
  p.set("category", profile.category);
  p.set("residency", profile.residency);
  if (profile.income_bracket) p.set("income_bracket", profile.income_bracket);
  if (profile.occupation) p.set("occupation", profile.occupation);
  p.set("is_bpl", profile.is_bpl ? "1" : "0");
  p.set("is_disabled", profile.is_disabled ? "1" : "0");
  return p.toString();
}

/** Returns null when any required field is missing or invalid. */
export function profileFromQuery(params: URLSearchParams): Profile | null {
  const age = Number(params.get("age"));
  const gender = params.get("gender") ?? "";
  const state = params.get("state") ?? "";
  const category = params.get("category") ?? "";
  const residency = params.get("residency") ?? "";
  const income = params.get("income_bracket") ?? undefined;
  const occupation = params.get("occupation") ?? undefined;

  if (!Number.isInteger(age) || age < 1 || age > 120) return null;
  if (!GENDERS.includes(gender) || !state) return null;
  if (!CATEGORIES.includes(category) || !RESIDENCIES.includes(residency)) return null;
  if (income && !INCOMES.includes(income)) return null;

  return {
    age,
    gender: gender as Profile["gender"],
    state,
    category: category as Profile["category"],
    residency: residency as Profile["residency"],
    income_bracket: income as Profile["income_bracket"],
    occupation: occupation || undefined,
    is_bpl: params.get("is_bpl") === "1",
    is_disabled: params.get("is_disabled") === "1",
  };
}

export function sameProfile(a: Profile, b: Profile): boolean {
  return (
    a.age === b.age &&
    a.gender === b.gender &&
    a.state === b.state &&
    a.category === b.category &&
    a.residency === b.residency &&
    (a.income_bracket ?? "") === (b.income_bracket ?? "") &&
    (a.occupation ?? "") === (b.occupation ?? "") &&
    a.is_bpl === b.is_bpl &&
    a.is_disabled === b.is_disabled
  );
}
