# Sarkari Saathi — Current App Structure

Reference doc for comparing against new page mockups. Reflects the app as of this session — update it if the structure changes.

## What it is

A mobile client (Expo/React Native) for a government scheme matcher. Talks to a FastAPI backend (`../sarkari-saathi/api/`) which wraps a rule-based matcher over ~3400 extracted scheme records, plus a RAG assistant (Chroma vector search + Cerebras LLM) for free-text questions. A Telegram bot version of the same backend logic also exists and runs independently.

## Navigation

A bottom tab navigator nested inside a root stack (`App.tsx`), the standard pattern for "tabs + drill-down detail screens":

```
RootStack (native-stack)
 ├─ MainTabs (bottom-tabs)         ← initial route
 │   ├─ Home        (no header)
 │   ├─ Search       { initialQuery?: string }
 │   ├─ AIAssistant  { initialQuery?: string }
 │   ├─ Saved
 │   └─ Profile      { editProfileId?: string }   (5-step wizard)
 ├─ Results        { profile }        (pushed on top, hides tab bar)
 ├─ SchemeDetail   { slug }           (pushed on top, hides tab bar)
 └─ Documents                        (pushed on top, hides tab bar)
```

Tab bar labels are short (Home/Search/Assistant/Saved/Profile) and set separately from each screen's header `title`. Screens nested in tabs reach `Results`/`SchemeDetail`/`Documents` via `TabScreenProps<T>` (a `CompositeScreenProps` combining the tab and root stack nav props, defined in `src/navigation.ts`).

## Screens

### Home (`src/screens/HomeScreen.tsx`)
Wrapped in `SafeAreaView` (top edge only — it has `headerShown: false`, so it must handle the status-bar inset itself).
- Header row: logo mark + app name/tagline, decorative notification bell (no backend behind it).
- "Namaste!" greeting + subtitle + a small icon-based decorative graphic (not custom artwork).
- **Primary gradient card**: "Find My Schemes" → switches to the Profile tab.
- **Quick Actions** 2×2 grid: Search Scheme → Search tab, Ask AI → AI Assistant tab, Documents → `Documents` screen, Saved → Saved tab.
- **Popular Categories** horizontal scroll (`CATEGORIES` constant: Education/Employment/Housing/Agriculture/Women/Health) — tapping navigates to Search with that label as `initialQuery`. This runs the existing keyword `/search` endpoint; it is **not** real structured category filtering (schemes aren't tagged that way in the backend).
- **Government Updates**: one static illustrative card, not live content.
- Compact saved-profiles summary (up to 2 shown, "View All" → Saved tab).

### Search (`src/screens/SearchScreen.tsx`)
- Search bar; while empty, shows a discovery view instead of results: hero banner card, **Popular Searches** chips (`POPULAR_SEARCHES`), **Categories** vertical list (same approximation as Home), and **Recent Searches** (new `src/storage/searchHistory.ts`, AsyncStorage-backed, capped at 10, with relative-time display and "Clear All").
- Once there's a query, the discovery view is replaced by live debounced results (`GET /search`) using the same card component as everywhere else. Every successful search is recorded to history.
- Accepts `{ initialQuery }` route param (from Home's cards/categories) — consumed via `useFocusEffect` and cleared from params afterward so it doesn't re-trigger on tab re-focus.

### AI Assistant (`src/screens/AskScreen.tsx`, tab labeled "Assistant")
- Chat-style greeting card (avatar + generic greeting — no stored user name/accounts to personalize with).
- **Example Questions** list (`EXAMPLE_QUESTIONS`) shown until the first question is asked — tapping one runs it immediately.
- Rounded pill input + circular send button pinned above the keyboard (`KeyboardAvoidingView`).
- Calls `POST /assistant/ask` (RAG: Chroma retrieval + Cerebras generation). Renders the generated answer, then a "Sources" section listing the schemes it was grounded in (tappable → SchemeDetail). No fabricated "related schemes" before a real question is asked.
- Also accepts `{ initialQuery }`, run automatically on focus.

### Profile (`src/screens/ProfileFormScreen.tsx`) — 5-step wizard
Steps: **1** Personal Details (Age, Gender) → **2** Location (State, Residency) → **3** Category & Income (Category required, income optional) → **4** Additional Info (Occupation, BPL, Disability, all optional) → **5** Review (summary of every field + "Save this profile" switch, capped at 4 saved profiles) → submit.
- Progress bar shows "Step X of 5". Nav buttons are **stacked vertically** (primary Next/Submit full-width on top, Back below as an outline button) — deliberately not side-by-side, since a two-across layout wrapped long button text ("Find matching schemes") to two lines.
- Because this is a persistent tab (not a fresh stack screen each time), a `useFocusEffect` resets every field back to blank whenever the screen gains focus **and there's no `editProfileId`** — otherwise old data from a previous fill-in would linger indefinitely. Edit mode (`editProfileId` present) still pre-fills from the saved profile as before.

### Saved (`src/screens/SavedScreen.tsx`, new)
The saved-profiles list (previously embedded in Home) now lives here in full: label, tap-to-search (→ Results), edit (→ Profile with `editProfileId`), delete (confirm dialog). Empty state shown if none saved yet.

### Documents (`src/screens/DocumentsScreen.tsx`, new)
Static informational list of commonly-required documents across schemes (Aadhaar, income certificate, caste certificate, etc.) — no backend, no per-scheme specificity (that's already covered on each scheme's own detail page).

### Results (`src/screens/ResultsListScreen.tsx`)
Unchanged. Calls `POST /match` with the profile, scrollable card list, tap → SchemeDetail.

### SchemeDetail (`src/screens/SchemeDetailScreen.tsx`)
Unchanged core logic. Gradient header with scheme name. Sections: Benefits, Documents required, Conditions. "Open application page" button. "Check my eligibility":
- If saved profiles exist → bottom-sheet picker to choose one (read-only, no data written).
- If none exist (or "answer questions instead" chosen) → fetches the specific questions *this* scheme cares about (`GET /schemes/{slug}/questions`) and renders only those.
- Either path POSTs to `/schemes/{slug}/eligibility`, rendered as an eligible/not-eligible verdict with reasons.

## Design system (`src/theme.ts`)

- **Colors**: single green primary (`#1a5f3f`) + neutrals, no dark mode yet.
- **Font**: Poppins (400/600/700/800), loaded via `@expo-google-fonts/poppins` in `App.tsx` (with `expo-splash-screen` held until fonts are ready).
- **Shared components**: `PrimaryButton` (gradient/outline/**flat-gray-when-disabled** — disabled state deliberately avoids opacity-on-gradient, which renders as a stray white box on Android when combined with the button's elevation shadow), `SelectButtons`, `SchemeListItem`, `FieldSection`, `ProgressBar`, `StatePickerModal`, `ProfilePickerModal`, `DynamicQuestionForm`, `SectionHeader` ("Title + View All" row), `Chip` (pill button for search/example-question suggestions).
- Gradients (`expo-linear-gradient`) and haptics (`expo-haptics`) used throughout primary actions; illustrations are icon compositions, not custom artwork.

## Data model (mobile-side, `src/types.ts`)

- `Profile` — the 9 form fields.
- `SavedProfile` — `{ id, label, profile }`, up to 4 stored locally (`AsyncStorage`, no backend account/sync).
- `Scheme` — full scheme record as returned by the API.
- `SearchHistoryEntry` — `{ query, timestamp }`, local only.
- No user accounts, no scheme bookmarking/favoriting (separate from saved profiles), no real category taxonomy, no notifications backend.
