"""
review.py — Manual QA: prints a sample of random extracted schemes
side-by-side with their original eligibility text, so extraction quality
can be spot-checked by a human.
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from utils import slugify  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_PATH = BASE_DIR / "data" / "raw" / "schemes_normalized.json"
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"

SAMPLE_SIZE = 10


def load_raw_lookup() -> dict:
    """Map slugified scheme_name -> original normalized record, so we can
    show the source eligibility text next to what got extracted."""
    if not RAW_PATH.exists():
        print(f"Warning: {RAW_PATH} not found — original eligibility text won't be shown.")
        return {}
    with open(RAW_PATH, "r", encoding="utf-8") as f:
        schemes = json.load(f)
    lookup = {}
    for s in schemes:
        name = s.get("scheme_name")
        if name:
            lookup[slugify(name)] = s
    return lookup


def main() -> int:
    extracted_files = sorted(EXTRACTED_DIR.glob("*.json"))
    if not extracted_files:
        print(f"No extracted schemes found in {EXTRACTED_DIR}. Run pipeline/extract.py first.")
        return 1

    sample = random.sample(extracted_files, min(SAMPLE_SIZE, len(extracted_files)))
    raw_lookup = load_raw_lookup()

    for i, path in enumerate(sample, 1):
        slug = path.stem
        with open(path, "r", encoding="utf-8") as f:
            extracted = json.load(f)

        raw = raw_lookup.get(slug)

        print("\n" + "#" * 80)
        print(f"[{i}/{len(sample)}] {extracted.get('scheme_name', slug)}")
        print("#" * 80)

        print("\n--- ORIGINAL ELIGIBILITY TEXT " + "-" * 47)
        if raw:
            print(f"Description: {raw.get('description') or '(none)'}")
            print(f"Eligibility: {raw.get('eligibility_text') or '(none)'}")
        else:
            print("(original record not found in schemes_normalized.json)")

        print("\n--- EXTRACTED JSON " + "-" * 58)
        print(json.dumps(extracted, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
