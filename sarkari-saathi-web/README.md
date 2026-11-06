# Sarkari Saathi — Web

Web version of the Sarkari Saathi government-scheme finder. Next.js (App Router) + TypeScript + Tailwind CSS v4. It talks to the same FastAPI backend as the mobile app (`../sarkari-saathi`).

## Setup

Requires Node.js 20+.

```bash
cd sarkari-saathi-web
npm install
cp .env.example .env.local     # then edit NEXT_PUBLIC_API_URL
npm run dev                    # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` is the backend base URL, e.g. `http://localhost:8000` locally or your deployed API. It is read at **build** time, so restart `npm run dev` / rebuild after changing it. The backend already allows any origin via CORS.

To run the backend locally, see `../sarkari-saathi/README.md` (`uvicorn api.main:app --port 8000`).

## Scripts

| Command         | What it does                      |
| --------------- | --------------------------------- |
| `npm run dev`   | Dev server                        |
| `npm run build` | Production build (type-checks)    |
| `npm run start` | Serve the production build        |
| `npm run lint`  | ESLint                            |

## Pages

| Route             | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `/`               | Hero + search, "Find My Schemes", categories, latest schemes         |
| `/check`          | 5-step profile wizard (`/check?edit=<id>` edits a saved profile)     |
| `/results`        | `POST /match` for a profile (profile lives in the query string)      |
| `/search?q=`      | Debounced `GET /search`, recent searches                             |
| `/schemes/[slug]` | Scheme detail + eligibility check                                    |
| `/assistant`      | AI chat via `POST /assistant/ask` (`?q=` pre-asks a question)        |
| `/saved`          | Saved profiles (max 4)                                               |
| `/documents`      | Common documents list                                                |

## Notes

- **Language:** EN / हिंदी toggle in the navbar; choice is stored in `localStorage` and also sent as `lang` to the API so scheme content is translated. UI strings live in `src/lib/i18n/strings.ts` (ported from the mobile app, plus web-only keys).
- **Local data:** saved profiles, search history and language use the same `localStorage` keys/shapes as the mobile app's storage layer (`src/lib/storage.ts`). Nothing is synced to a server.
- **Shared with mobile:** `src/lib/types.ts`, `src/lib/i18n/options.ts` and the colour palette (`src/app/globals.css`) are copies of the mobile app's `types.ts`, `i18n/options.ts` and `theme.ts`. Keep them in sync when the API changes.
- **Not included yet:** push notifications and OTP login.
- **Next.js 16 Cache Components** is enabled (see `next.config.ts`): anything reading `searchParams`/`params` must sit inside a `<Suspense>` boundary, as the page files do.
