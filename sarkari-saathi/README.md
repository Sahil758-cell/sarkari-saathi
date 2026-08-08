# Sarkari Saathi

Sarkari Saathi is an AI agent that matches Indian citizens to government schemes
they're eligible for, via a Telegram bot.

- **Phase 1** — a pipeline that turns free-text scheme data (name, description,
  eligibility criteria) into clean, structured JSON.
- **Phase 2** — a Telegram bot that collects a citizen's profile through a
  guided Q&A and matches it against that structured data, instantly and for
  free (pure rule-based filtering, no AI call at match time).

## Project layout

```
sarkari-saathi/
├── data/
│   ├── raw/          # source dataset (downloaded or manually placed)
│   └── extracted/    # structured JSON output, one file per scheme
├── pipeline/
│   ├── download.py   # fetch + normalize the source dataset
│   ├── extract.py    # Cerebras-powered eligibility extraction
│   ├── review.py     # manual QA: sample extracted vs. original text
│   └── utils.py       # shared slugify helper
├── bot/
│   ├── telegram_bot.py # conversation flow + entry point
│   ├── matcher.py       # rule-based scheme matching over data/extracted/
│   └── i18n.py           # English/Hindi prompt strings
├── .env.example
├── requirements.txt
└── README.md
```

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and fill in both keys:

   ```bash
   cp .env.example .env
   ```

   ```
   # Free tier at https://cloud.cerebras.ai
   CEREBRAS_API_KEY=csk-your-key-here

   # From @BotFather on Telegram (send it /newbot)
   TELEGRAM_BOT_TOKEN=123456789:your-bot-token-here
   ```

## Usage

### Phase 1 — build the dataset

```bash
python pipeline/download.py   # 1. fetch + normalize the dataset into data/raw/
python pipeline/extract.py    # 2. extract structured eligibility JSON for every scheme
python pipeline/review.py     # 3. spot-check 10 random extractions against the source text
```

#### 1. `download.py`

Tries to pull the **shrijayan/gov_myscheme** dataset from Hugging Face. If
that fails (no network, dataset gated, or — as we found — it turns out to be
a bundle of PDFs, not tabular data), it prints instructions to manually
download the Kaggle dataset
[jainamgada45/indian-government-schemes](https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes)
and drop the CSV into `data/raw/`. Either way, on completion it scans
`data/raw/` for a usable file, auto-detects and maps its columns, and writes
a normalized `data/raw/schemes_normalized.json` with a consistent schema:
`scheme_name`, `description`, `eligibility_text`, `benefits`,
`application_link`, `state_or_ministry`.

#### 2. `extract.py`

For every scheme in `schemes_normalized.json` (~3400 in the Kaggle dataset —
set `MAX_SCHEMES=20` as an env var for a quick test run), calls the
**Cerebras** API (`gpt-oss-120b`, free tier) with a strict JSON-schema
response format to convert the free-text eligibility criteria into a
structured JSON object (occupation, gender, age range, income cap, category,
state, etc. — see `pipeline/extract.py` for the full schema). Every response
is additionally validated with Pydantic as a safety net; on failure it
retries once with the error fed back to the model, and logs any
still-failing scheme to `data/extracted/_failures.jsonl` instead of crashing
the run. Successes are written to `data/extracted/<slugified-scheme-name>.json`.

The script is **resumable** — re-running it skips schemes that already have
an output file — and paces itself to stay under the Cerebras free tier
(5 requests/minute, 150/hour, 2400/day). Because of that cap, extracting the
full ~3400-scheme dataset takes roughly **1–2 days** of background running;
the Telegram bot works the whole time and simply gains coverage as more
files land in `data/extracted/`.

#### 3. `review.py`

Picks 10 random files from `data/extracted/` and prints the original
eligibility text next to the extracted JSON so you can manually verify
quality.

### Phase 2 — run the Telegram bot

```bash
python bot/telegram_bot.py
```

Message your bot on Telegram. Two commands:

- **`/start`** — guided profile Q&A (language, age, gender, state, category,
  income bracket, occupation, BPL status, disability status, rural/urban
  residency), then returns matching schemes as a numbered, paginated list
  (Back/Next buttons) ranked by how specifically they match, each with a
  "View details" button for the full eligibility breakdown, documents
  required, and application link.
- **`/search`** — check eligibility for one *specific* scheme by name.
  Finds it (fuzzy name match; asks you to pick if there are several), then
  asks only the questions *that scheme's own eligibility criteria actually
  require* — e.g. a scheme with no income cap never asks about income — and
  gives a clear ✅/❌ verdict with reasons, followed by full details.

Matching and eligibility-checking are pure rule-based logic over
`data/extracted/*.json` (`bot/matcher.py`) — no AI call happens when a user
talks to the bot, so both commands are instant and don't touch your
Cerebras rate limit. If a `/start` state-specific search finds nothing
(likely while the dataset is still filling in), it automatically relaxes
the state filter and shows the best available matches instead of a dead
end. Application links fall back to the scheme's official myScheme.gov.in
page when the eligibility text itself didn't state a URL.
