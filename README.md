# Sarkari Saathi

Sarkari Saathi ("government companion") helps Indian citizens discover government
welfare schemes they're actually eligible for. It's two things sharing one backend:

- A **React Native / Expo mobile app** — eligibility wizard, saved profiles, phone/email
  OTP login, and an AI assistant you can ask questions in plain language.
- A **Telegram bot** — the original interface, still fully working, offering the same
  guided eligibility Q&A and scheme search over Telegram.

Both are powered by a **FastAPI backend** built around a ~3,400-scheme dataset,
rule-based eligibility matching, and a retrieval-augmented AI assistant.

## Repo layout

```
Sarkari Saathi/
├── sarkari-saathi/         # Backend: FastAPI API, Telegram bot, data pipeline
│   ├── api/                # FastAPI app (matching, RAG assistant, auth)
│   ├── bot/                # Telegram bot + rule-based matcher
│   ├── pipeline/           # Dataset extraction + embedding pipeline
│   └── data/                # Source dataset, extracted JSON, vector store
└── sarkari-saathi-app/     # Mobile app (Expo / React Native / TypeScript)
    └── src/
```

## How it works

### 1. Turning raw scheme text into a structured, searchable dataset

`pipeline/extract.py` takes ~3,400 government schemes (free-text name,
description, eligibility criteria) and converts each into validated structured
JSON — age range, income cap, category, state, occupation, etc. — using the
Cerebras API (`gpt-oss-120b`) with a strict JSON-schema response format,
Pydantic validation, and automatic retry on malformed output. It's rate-limit
aware and resumable, since Cerebras' free tier caps requests.

`pipeline/build_embeddings.py` then embeds every scheme into a persistent
**Chroma** vector store for semantic search.

### 2. Two ways to find a match

- **Rule-based matching** (`bot/matcher.py`) — deterministic filtering over the
  structured dataset by age, gender, state, category, income, etc. Instant,
  free, no LLM call. Powers both the Telegram bot and the mobile app's
  eligibility wizard.
- **AI assistant** (`api/rag.py`) — ask a question in plain language. Retrieval
  combines dense semantic search (Chroma) with structured keyword hints
  extracted from the query, so filters like state/category aren't left purely
  to embedding similarity. The LLM (Cerebras `gpt-oss-120b`) answers grounded
  only in retrieved context, and can autonomously call a **tool** to run a
  live, domain-restricted web search (Tavily API, scoped to official
  `.gov.in` sites) when local data doesn't cover the question — with graceful
  degradation if the tool call fails and self-correction retries if the model
  returns malformed output.

### 3. Login without paying for SMS

Phone/email OTP auth (`api/otp.py`, `api/email_otp.py`, `api/otp_quota.py`)
sends SMS OTPs via a pay-per-message gateway up to a small self-imposed daily
cap, then automatically falls back to email OTP (Gmail SMTP) for the rest of
the day — avoiding both per-message cost and India's SMS carrier registration
(DLT) requirements for a bootstrapped project.

## Setup

### Backend

```bash
cd sarkari-saathi
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in your API keys — see comments in the file
```

Build the dataset (or use the version already checked into `data/`):

```bash
python pipeline/download.py
python pipeline/extract.py
python pipeline/build_embeddings.py
```

Run the API:

```bash
uvicorn api.main:app --reload
```

Or the Telegram bot:

```bash
python bot/telegram_bot.py
```

### Mobile app

```bash
cd sarkari-saathi-app
npm install
cp .env.example .env        # point EXPO_PUBLIC_API_URL at your running backend
npx expo start
```

Full backend documentation (dataset pipeline details, matcher/eligibility
logic) lives in [`sarkari-saathi/README.md`](sarkari-saathi/README.md).
