import type {
  AskResponse,
  EligibilityOut,
  MatchResponse,
  PartialProfile,
  Profile,
  QuestionSpec,
  Scheme,
} from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

/** Thrown for any failed request. `status` is 0 for network failures. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not set — see the README.", 0);
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError("Network error", 0);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`Request to ${path} failed: ${res.status} ${body}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function matchProfile(profile: Profile, limit = 30, lang = "en") {
  return request<MatchResponse>(`/match?limit=${limit}&lang=${lang}`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function getScheme(slug: string, lang = "en") {
  return request<Scheme>(`/schemes/${encodeURIComponent(slug)}?lang=${lang}`);
}

/** Slow fallback (several seconds): looks the scheme up on official gov.in sites. 0 or 1 results. */
export function searchLive(query: string, lang = "en", signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query, lang });
  return request<MatchResponse>(`/search/live?${params.toString()}`, { signal });
}

export function searchSchemes(query: string, limit = 20, lang = "en", signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query, limit: String(limit), lang });
  return request<MatchResponse>(`/search?${params.toString()}`, { signal });
}

export function getLatestSchemes(limit = 6, lang = "en") {
  return request<MatchResponse>(`/schemes/latest?limit=${limit}&lang=${lang}`);
}

export function checkEligibility(slug: string, profile: PartialProfile) {
  return request<EligibilityOut>(`/schemes/${encodeURIComponent(slug)}/eligibility`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function getQuestions(slug: string) {
  return request<QuestionSpec[]>(`/schemes/${encodeURIComponent(slug)}/questions`);
}

export function askAssistant(query: string, lang = "en") {
  return request<AskResponse>("/assistant/ask", {
    method: "POST",
    body: JSON.stringify({ query, lang }),
  });
}
