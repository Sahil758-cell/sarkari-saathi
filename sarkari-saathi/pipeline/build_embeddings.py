"""
build_embeddings.py — Embed every extracted scheme into a local Chroma
vector store, for the "Ask Sarkari Saathi" RAG feature (api/rag.py).

Uses Chroma's built-in default embedding function (ONNX MiniLM-L6-v2, via
onnxruntime) rather than sentence-transformers/torch — a fraction of the
dependency footprint for equivalent quality at this corpus size (~3400
short documents).

Resumable: schemes already present in the collection are skipped, so this
can be safely re-run whenever new schemes are extracted.
"""
import argparse
import json
import sys
from pathlib import Path

import chromadb
from chromadb.config import Settings
from tqdm import tqdm

BASE_DIR = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE_DIR / "data" / "extracted"
VECTORDB_DIR = BASE_DIR / "data" / "vectordb"
BATCH_SIZE = 100


def build_document(scheme: dict) -> str:
    """Turn a scheme's structured fields into embeddable text. Unrestricted
    fields are spelled out as "open to all ..." rather than omitted — a
    scheme with no category restriction (matcher.py treats this as
    "eligible for everyone including EWS") otherwise never mentions "EWS"
    at all, so it can't be semantically retrieved for an EWS-specific
    query even though it logically qualifies. Explicit > implicit here."""
    conditions = "; ".join(scheme.get("other_conditions") or [])
    documents = ", ".join(scheme.get("documents_required") or [])

    state = scheme.get("state")
    state_text = f"Available in: {', '.join(state)}." if state else "Available in all states."

    category = scheme.get("category")
    category_text = (
        f"Open to categories: {', '.join(category)}."
        if category
        else "Open to all categories: General, SC, ST, OBC, EWS."
    )

    gender = scheme.get("gender")
    gender_text = (
        f"For {gender} applicants." if gender and gender != "any" else "Open to all genders."
    )

    residency = scheme.get("residency")
    residency_text = (
        f"For {residency} residents."
        if residency and residency != "any"
        else "Open to rural and urban residents."
    )

    occupation = scheme.get("occupation")
    occupation_text = f"For occupations: {', '.join(occupation)}." if occupation else ""

    age_parts = []
    if scheme.get("age_min") is not None:
        age_parts.append(f"minimum age {scheme['age_min']}")
    if scheme.get("age_max") is not None:
        age_parts.append(f"maximum age {scheme['age_max']}")
    age_text = f"Age: {', '.join(age_parts)}." if age_parts else ""

    income_text = (
        f"Maximum annual income: {scheme['max_annual_income']}."
        if scheme.get("max_annual_income") is not None
        else ""
    )

    bpl_text = "Requires BPL (Below Poverty Line) status." if scheme.get("is_bpl_required") else ""
    disability_text = (
        "Targeted at persons with disabilities." if scheme.get("is_disabled_targeted") else ""
    )

    parts = [
        f"{scheme.get('scheme_name', '')}.",
        scheme.get("benefits_summary", ""),
        state_text,
        category_text,
        gender_text,
        residency_text,
        occupation_text,
        age_text,
        income_text,
        bpl_text,
        disability_text,
        f"Conditions: {conditions}." if conditions else "",
        f"Documents required: {documents}." if documents else "",
    ]
    return " ".join(p for p in parts if p)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Delete and recreate the collection first (use after changing build_document()).",
    )
    args = parser.parse_args()

    if not EXTRACTED_DIR.exists():
        print(f"No extracted schemes found at {EXTRACTED_DIR}. Run pipeline/extract.py first.")
        return 1

    VECTORDB_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(VECTORDB_DIR), settings=Settings(anonymized_telemetry=False)
    )
    if args.rebuild:
        try:
            client.delete_collection("schemes")
            print("Deleted existing collection for rebuild.")
        except Exception:
            pass  # nothing to delete on a first-ever run
    collection = client.get_or_create_collection("schemes")

    existing_ids = set(collection.get(include=[])["ids"])

    paths = sorted(EXTRACTED_DIR.glob("*.json"))
    todo = [p for p in paths if p.stem not in existing_ids]
    print(f"{len(existing_ids)} already embedded, {len(todo)} to add.")

    batch_ids: list[str] = []
    batch_docs: list[str] = []
    batch_metas: list[dict] = []
    added = 0
    skipped = 0

    def flush():
        nonlocal batch_ids, batch_docs, batch_metas
        if batch_ids:
            collection.add(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
            batch_ids, batch_docs, batch_metas = [], [], []

    for path in tqdm(todo, desc="Embedding schemes"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                scheme = json.load(f)
        except (json.JSONDecodeError, OSError):
            skipped += 1
            continue

        batch_ids.append(path.stem)
        batch_docs.append(build_document(scheme))
        batch_metas.append({"slug": path.stem, "scheme_name": scheme.get("scheme_name", "")})
        added += 1

        if len(batch_ids) >= BATCH_SIZE:
            flush()

    flush()

    print("\n" + "=" * 40)
    print("Embedding summary")
    print("=" * 40)
    print(f"Added:   {added}")
    print(f"Skipped: {skipped}")
    print(f"Total in collection: {collection.count()}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
