"""
backfill_date_added.py — One-off script: stamps `date_added` on every
extracted scheme JSON file that doesn't already have it (i.e. every scheme
that predates the "Latest Schemes" / notifications feature). All backfilled
files get the SAME timestamp (the moment this script runs) since there's no
reliable per-scheme "actually added" date to recover — git history collapses
to one bulk-commit date, not useful for real ordering.

Run once: python pipeline/backfill_date_added.py
"""
import json
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"


def main() -> int:
    if not EXTRACTED_DIR.exists():
        print(f"{EXTRACTED_DIR} not found.")
        return 1

    stamp = datetime.now(timezone.utc).isoformat()
    updated = 0
    skipped = 0

    for path in sorted(EXTRACTED_DIR.glob("*.json")):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "date_added" in data:
            skipped += 1
            continue

        data["date_added"] = stamp
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        updated += 1

    print(f"Backfilled {updated} files with date_added={stamp}")
    print(f"Skipped {skipped} files that already had it")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
