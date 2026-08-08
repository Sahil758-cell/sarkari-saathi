"""Shared helpers for the Sarkari Saathi extraction pipeline."""
import hashlib
import re


def slugify(text: str, max_length: int = 80) -> str:
    """Convert a scheme name into a filesystem-safe slug, e.g.
    'PM Kisan Samman Nidhi' -> 'pm-kisan-samman-nidhi'.

    Some source datasets have very long compound scheme names (e.g.
    "'X' under 'Y Scheme'") that blow past Windows' ~260 char MAX_PATH once
    combined with the project's directory prefix. Truncate to max_length and
    append a short content hash so distinct long names that share the same
    truncated prefix don't collide.
    """
    original = text.strip()
    slug = original.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-") or "untitled-scheme"

    if len(slug) > max_length:
        suffix = hashlib.sha1(original.encode("utf-8")).hexdigest()[:8]
        slug = f"{slug[:max_length].rstrip('-')}-{suffix}"

    return slug
