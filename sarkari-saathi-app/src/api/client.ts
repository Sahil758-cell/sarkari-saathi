import {
  AskResponse,
  EligibilityOut,
  MatchResponse,
  PartialProfile,
  Profile,
  QuestionSpec,
  Scheme,
} from "../types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set — create a .env file (see README)."
    );
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request to ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export function matchProfile(profile: Profile, limit = 30): Promise<MatchResponse> {
  return request<MatchResponse>(`/match?limit=${limit}`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function getScheme(slug: string): Promise<Scheme> {
  return request<Scheme>(`/schemes/${encodeURIComponent(slug)}`);
}

export function searchSchemes(query: string, limit = 10): Promise<MatchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return request<MatchResponse>(`/search?${params.toString()}`);
}

export function checkEligibility(
  slug: string,
  profile: PartialProfile
): Promise<EligibilityOut> {
  return request<EligibilityOut>(`/schemes/${encodeURIComponent(slug)}/eligibility`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function getQuestions(slug: string): Promise<QuestionSpec[]> {
  return request<QuestionSpec[]>(`/schemes/${encodeURIComponent(slug)}/questions`);
}

export function askAssistant(query: string): Promise<AskResponse> {
  return request<AskResponse>("/assistant/ask", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function sendOtp(email: string): Promise<{ session_id: string }> {
  return request<{ session_id: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(sessionId: string, otp: string): Promise<{ verified: boolean }> {
  return request<{ verified: boolean }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, otp }),
  });
}
