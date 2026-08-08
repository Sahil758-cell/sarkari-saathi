"""
download.py — Fetch the myScheme dataset and normalize it into a single
structured file the rest of the pipeline can consume.

Primary source: Hugging Face dataset "shrijayan/gov_myscheme".
Fallback: manually downloaded Kaggle dataset
          "jainamgada45/indian-government-schemes" placed in data/raw/.

Either way, this script ends by scanning data/raw/ for a usable source file
and writing a normalized data/raw/schemes_normalized.json with columns:
scheme_name, description, eligibility_text, benefits, application_link,
state_or_ministry. extract.py consumes this normalized file.
"""
import json
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
NORMALIZED_PATH = RAW_DIR / "schemes_normalized.json"
HF_DUMP_PATH = RAW_DIR / "hf_myscheme_raw.csv"

HF_DATASET_ID = "shrijayan/gov_myscheme"
KAGGLE_DATASET_ID = "jainamgada45/indian-government-schemes"

# Candidate source-column names (lowercased, non-alphanumeric stripped) for
# each field in our normalized schema. Covers both the HF dataset and the
# Kaggle fallback dataset, whose exact column names may differ.
COLUMN_ALIASES = {
    "scheme_name": ["schemename", "scheme", "name", "title", "schemetitle"],
    "description": ["description", "details", "schemedescription", "about", "summary", "briefdescription"],
    "eligibility_text": ["eligibility", "eligibilitytext", "eligibilitycriteria", "whocanapply", "criteria", "eligibilitydescription"],
    "benefits": ["benefits", "benefit", "schemebenefits", "benefitdescription"],
    "application_link": ["applicationlink", "application", "link", "url", "website", "applylink", "officiallink", "schemelink"],
    "state_or_ministry": ["state", "ministry", "stateministry", "department", "stateut", "level", "tags"],
    # Portal slug (e.g. myScheme.gov.in's own URL slug for the scheme) — not
    # part of the Phase-1 extraction schema, but useful as a fallback link
    # when the eligibility text itself doesn't state an application URL.
    "portal_slug": ["slug"],
}


def _clean_col(col: str) -> str:
    return "".join(ch for ch in str(col).lower() if ch.isalnum())


def download_from_huggingface() -> bool:
    """Try to pull the dataset from Hugging Face. Returns True on success."""
    try:
        from datasets import load_dataset
    except ImportError:
        print("The `datasets` library is not installed. Run: pip install -r requirements.txt")
        return False

    try:
        print(f"Downloading '{HF_DATASET_ID}' from Hugging Face...")
        ds = load_dataset(HF_DATASET_ID)
        split_name = list(ds.keys())[0]
        df = ds[split_name].to_pandas()
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(HF_DUMP_PATH, index=False)
        print(f"Downloaded {len(df)} rows -> {HF_DUMP_PATH}")
        return True
    except Exception as e:
        print(f"Hugging Face download failed: {e}")
        return False


def print_manual_instructions() -> None:
    print("=" * 70)
    print("AUTOMATIC DOWNLOAD FAILED")
    print("=" * 70)
    print(
        "Please manually download the Kaggle dataset:\n"
        f"  {KAGGLE_DATASET_ID}\n"
        "  https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes\n\n"
        "Steps:\n"
        "  1. Download the CSV file from the Kaggle page above.\n"
        f"  2. Place it inside: {RAW_DIR}\n"
        "  3. Re-run this script (python pipeline/download.py) — it will\n"
        "     detect the file and normalize it automatically.\n"
    )
    print("=" * 70)


def _find_manual_source_file() -> Optional[Path]:
    """Locate a source file placed in data/raw/ by the user (e.g. the
    Kaggle CSV), ignoring our own output file and the HF dump. Checked
    before attempting a Hugging Face download so a manually-added file
    always takes priority and doesn't get re-shadowed by a fresh HF dump
    on every run."""
    if not RAW_DIR.exists():
        return None
    candidates = [
        p for p in RAW_DIR.iterdir()
        if p.is_file()
        and p.suffix.lower() in (".csv", ".json")
        and p not in (NORMALIZED_PATH, HF_DUMP_PATH)
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def _load_any(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        # Some exports nest the row list under a top-level key.
        for value in data.values():
            if isinstance(value, list):
                data = value
                break
    return pd.DataFrame(data)


def normalize(path: Path) -> list:
    df = _load_any(path)
    clean_to_original = {_clean_col(c): c for c in df.columns}

    resolved = {}
    for target, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in clean_to_original:
                resolved[target] = clean_to_original[alias]
                break

    print("Resolved column mapping:")
    for target in COLUMN_ALIASES:
        print(f"  {target:20s} <- {resolved.get(target, '(not found)')}")

    records = []
    for _, row in df.iterrows():
        record = {}
        for target in COLUMN_ALIASES:
            source_col = resolved.get(target)
            if source_col is None:
                record[target] = None
            else:
                value = row[source_col]
                record[target] = None if pd.isna(value) else str(value).strip()
        if record.get("scheme_name"):
            records.append(record)
    return records


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # A manually-placed file (e.g. the Kaggle fallback CSV) always takes
    # priority — skip re-attempting the HF download if one is already there.
    source = _find_manual_source_file()
    if source is not None:
        print(f"Found existing source file in data/raw/: {source}")
    else:
        hf_ok = download_from_huggingface()
        if not hf_ok:
            print_manual_instructions()
            return 0
        source = HF_DUMP_PATH

    print(f"\nNormalizing source file: {source}")
    records = normalize(source)
    if not records:
        # Either the HF dataset had no usable tabular columns (e.g. it turned
        # out to be a bundle of PDFs, not structured data) or the manually
        # placed file's columns didn't match our aliases. Either way, this
        # counts as "the automated path didn't produce data" — point the
        # user at the manual fallback instead of silently exiting.
        print("Normalization produced 0 usable rows from this file — its columns don't look like scheme data.")
        if source == HF_DUMP_PATH:
            # Remove the useless HF dump so it doesn't linger and confuse a
            # future run into thinking it's a valid manual source file.
            HF_DUMP_PATH.unlink(missing_ok=True)
        print_manual_instructions()
        return 1

    with open(NORMALIZED_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"\nWrote {len(records)} normalized schemes -> {NORMALIZED_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
