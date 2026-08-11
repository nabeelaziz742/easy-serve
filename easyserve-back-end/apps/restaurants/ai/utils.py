import csv
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Tuple
import logging


logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_analyzer_base_dir() -> Path:
    """
    Locate the sibling "Restaurant easyserve-analyzer" directory.
    You can override via env ANALYZER_DIR.
    """
    env_path = os.environ.get("ANALYZER_DIR")
    if env_path:
        p = Path(env_path).expanduser().resolve()
        if p.exists():
            return p

    # Compute from this file location: apps/restaurants/ai/notifications.py -> project root
    project_root = Path(__file__).resolve().parents[3]  # .../Restaurant backend
    # Sibling folder assumed to be alongside "Restaurant backend"
    sibling = project_root.parent / "easyserve-analyzer"
    if sibling.exists():
        return sibling

    # Fallback: try a generic "easyserve-analyzer" folder name nearby
    alt = project_root.parent / "easyserve-analyzer"
    if alt.exists():
        return alt

    # Last resort: return the project_root to avoid crashes; callers should handle missing files
    return project_root


def _safe_float(x: str, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception as exc:
        logger.warning(exc)
        return default


def get_restaurant_ratings_path() -> Path:
    return Path(__file__).resolve().parent / "restaurant_ratings.csv"


def get_restaurants_cleaned_path() -> Path:
    return Path(__file__).resolve().parent / "restaurants_cleaned.csv"


def get_restaurant_ratings_path1() -> Path:
    base = get_analyzer_base_dir()
    return base / "outputs" / "cleaned_data" / "restaurant_ratings.csv"


def get_restaurants_cleaned_path1() -> Path:
    base = get_analyzer_base_dir()
    return base / "outputs" / "cleaned_data" / "restaurants_cleaned.csv"


@lru_cache(maxsize=1)
def load_restaurant_ratings() -> List[Tuple[int, float]]:
    """
    Load (restaurant_id, avg_rating) pairs from easyserve-analyzer output, sorted by rating DESC.
    Returns an empty list if the file is missing.
    """
    ratings_path = get_restaurant_ratings_path()
    if not ratings_path.exists():
        print('file not found:', ratings_path)
        return []

    out: List[Tuple[int, float]] = []
    with ratings_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = int(row.get("restaurant_id", "0") or 0)
            rating = _safe_float(row.get("avg_rating", "0"), 0.0)
            if rid > 0:
                out.append((rid, rating))

    out.sort(key=lambda x: x[1], reverse=True)
    return out


@lru_cache(maxsize=1)
def load_restaurants_cleaned_by_id() -> Dict[int, dict]:
    """
    Load restaurants_cleaned.csv as a mapping id -> row dict.
    Used as a fallback to map IDs to names if DB rows are missing.
    """
    p = get_restaurants_cleaned_path()
    if not p.exists():
        return {}

    by_id: Dict[int, dict] = {}
    with p.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                rid = int(row.get("id", "0") or 0)
            except Exception as exc:
                logger.warning(exc)
                continue
            if rid > 0:
                by_id[rid] = row
    return by_id


def top_restaurant_ids(n: int = 10) -> List[int]:
    ratings = load_restaurant_ratings()
    if not ratings:
        return []
    n = max(1, min(int(n or 10), 100))
    return [rid for rid, _ in ratings[:n]]
