// Mirrors api/schemas.py in the sarkari-saathi backend.

export interface Profile {
  age: number;
  gender: "male" | "female";
  state: string;
  category: "general" | "sc" | "st" | "obc" | "ews";
  income_bracket?: "below_1l" | "1_2l" | "2_5l" | "5_8l" | "above_8l";
  is_bpl: boolean;
  is_disabled: boolean;
  residency: "rural" | "urban";
  occupation?: string;
}

export interface Scheme {
  slug: string;
  scheme_name: string;
  occupation: string[] | null;
  gender: string | null;
  age_min: number | null;
  age_max: number | null;
  max_annual_income: number | null;
  category: string[] | null;
  state: string[] | null;
  is_bpl_required: boolean | null;
  is_disabled_targeted: boolean | null;
  residency: string | null;
  other_conditions: string[];
  benefits_summary: string | null;
  documents_required: string[];
  application_link: string | null;
  portal_url: string | null;
}

export interface MatchResponse {
  count: number;
  results: Scheme[];
}

export interface EligibilityReason {
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface EligibilityOut {
  eligible: boolean;
  reasons: EligibilityReason[];
}

export interface SavedProfile {
  id: string;
  label: string;
  profile: Profile;
}

// Answers from the scheme-specific question flow (DynamicQuestionForm) are
// only ever a subset of Profile's fields, and state/residency can also hold
// matcher's internal sentinel values for "no" answers (see
// bot/telegram_bot.py's _record_search_answer) that Profile itself never has.
export type PartialProfile = Partial<Omit<Profile, "state" | "residency">> & {
  state?: string;
  residency?: "rural" | "urban" | "_MISMATCH_";
};

export interface QuestionSpec {
  key: string;
  type: "text" | "buttons" | "yesno";
  states?: string[];
  residency?: string;
}

export interface WebSource {
  title: string;
  url: string;
}

export interface AskResponse {
  answer: string;
  sources: Scheme[];
  web_sources: WebSource[];
}
