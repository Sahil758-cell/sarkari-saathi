import {
  AskResponse,
  EligibilityOut,
  MatchResponse,
  NotificationEntry,
  PartialProfile,
  Profile,
  QuestionSpec,
  Scheme,
} from "../types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Set once by AuthContext (on login, on restoring a stored session, and
// cleared on logout) so the handful of session-gated calls below can attach
// it without every call site having to thread a token through.
let sessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

async function request<T>(
  path: string,
  options?: RequestInit,
  auth?: boolean
): Promise<T> {
  if (!BASE_URL) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set — create a .env file (see README)."
    );
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
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

export function verifyOtp(
  sessionId: string,
  otp: string
): Promise<{ verified: boolean; session_token: string | null }> {
  return request<{ verified: boolean; session_token: string | null }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, otp }),
  });
}

export function getLatestSchemes(limit = 20): Promise<MatchResponse> {
  return request<MatchResponse>(`/schemes/latest?limit=${limit}`);
}

export function registerPushToken(
  expoPushToken: string,
  platform: string
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    "/notifications/register",
    { method: "POST", body: JSON.stringify({ expo_push_token: expoPushToken, platform }) },
    true
  );
}

export function syncProfiles(profiles: Profile[]): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    "/notifications/sync-profiles",
    { method: "POST", body: JSON.stringify({ profiles }) },
    true
  );
}

export function unregisterPushToken(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    "/notifications/unregister",
    { method: "POST" },
    true
  );
}

export function getNotificationHistory(): Promise<NotificationEntry[]> {
  return request<NotificationEntry[]>("/notifications/history", undefined, true);
}
