"""
jarvis-ai/server/app/services/memory_service.py
Mark LV-grade Persistent Recallable Memory Subsystem.
Ported from Mark LV memory/memory_manager.py architecture.
"""
from __future__ import annotations
import json
import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("jarvis.memory")

# Locate persistent memory path relative to repo or jarvis-ai
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
MEMORY_FILE = REPO_ROOT / "memory" / "long_term.json"

_lock = threading.Lock()

_CATEGORY_LABELS = {
    "preferences": "Preferences",
    "projects": "Active projects / goals",
    "relationships": "People in their life",
    "wishes": "Wishes / plans",
    "notes": "Notes",
}

_IDENTITY_FIELDS = ["name", "age", "birthday", "city", "job", "language", "school", "nationality"]

PROMPT_CORE_CHARS = 900
PROMPT_INDEX_CHARS = 420
PROMPT_MAX_PER_CATEGORY = 6


def _empty_memory() -> Dict[str, Any]:
    return {
        "identity": {},
        "preferences": {},
        "projects": {},
        "relationships": {},
        "wishes": {},
        "notes": {},
    }


class MemoryService:
    @classmethod
    def _ensure_dir(cls):
        MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)

    @classmethod
    def load_memory(cls) -> Dict[str, Any]:
        cls._ensure_dir()
        if not MEMORY_FILE.exists():
            return _empty_memory()
        with _lock:
            try:
                data = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    base = _empty_memory()
                    for k in base:
                        if k not in data:
                            data[k] = {}
                    return data
            except Exception as e:
                logger.warning(f"Error reading memory file: {e}")
        return _empty_memory()

    @classmethod
    def save_memory(cls, data: Dict[str, Any]) -> bool:
        cls._ensure_dir()
        with _lock:
            try:
                MEMORY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                return True
            except Exception as e:
                logger.error(f"Error saving memory file: {e}")
                return False

    @classmethod
    def store_fact(cls, category: str, key: str, value: str) -> bool:
        data = cls.load_memory()
        if category not in data:
            data[category] = {}
        data[category][key.strip().lower().replace(" ", "_")] = {
            "value": value.strip(),
            "updated": datetime.now().strftime("%Y-%m-%d")
        }
        return cls.save_memory(data)

    @classmethod
    def remove_fact(cls, category: str, key: str) -> bool:
        data = cls.load_memory()
        if category in data and key in data[category]:
            del data[category][key]
            return cls.save_memory(data)
        return False

    @classmethod
    def search_memory(cls, query: str) -> List[Dict[str, Any]]:
        """Fast local keyword search across all categories without LLM overhead."""
        q = query.lower().strip()
        data = cls.load_memory()
        results = []
        for cat, items in data.items():
            if not isinstance(items, dict):
                continue
            for k, val in items.items():
                text_val = val.get("value", "") if isinstance(val, dict) else str(val)
                if q in k.lower() or q in text_val.lower():
                    results.append({
                        "category": cat,
                        "key": k,
                        "value": text_val,
                        "updated": val.get("updated", "") if isinstance(val, dict) else ""
                    })
        return results

    @classmethod
    def format_memory_for_prompt(cls) -> str:
        """
        Builds the compact, token-budgeted memory block for the system prompt.
        Preserved from Mark LV: Identity in full, recent facts up to budget, and index of keys.
        """
        memory = cls.load_memory()
        if not memory:
            return ""

        core_lines: List[str] = []

        # 1. Identity - full
        identity = memory.get("identity", {}) or {}
        for field in _IDENTITY_FIELDS:
            entry = identity.get(field)
            val = entry.get("value", "") if isinstance(entry, dict) else str(entry or "")
            if val:
                core_lines.append(f"{field.title()}: {val}")

        # 2. Most recently updated entries across categories
        rest = []
        for cat in _CATEGORY_LABELS:
            items = memory.get(cat, {}) or {}
            for k, entry in items.items():
                val = entry.get("value", "") if isinstance(entry, dict) else str(entry or "")
                if not val:
                    continue
                updated = (entry.get("updated", "") if isinstance(entry, dict) else "") or "0000-00-00"
                rest.append((updated, cat, k, val))
        rest.sort(key=lambda t: t[0], reverse=True)

        shown: Dict[str, List[str]] = {}
        overflow: Dict[str, List[str]] = {}
        used = sum(len(l) + 1 for l in core_lines)

        for updated, cat, key, val in rest:
            entry_str = f"{key.replace('_', ' ')}: {val}"
            shown.setdefault(cat, [])
            overflow.setdefault(cat, [])
            if len(shown[cat]) < PROMPT_MAX_PER_CATEGORY and (used + len(entry_str) + 2) <= PROMPT_CORE_CHARS:
                shown[cat].append(entry_str)
                used += len(entry_str) + 2
            else:
                overflow[cat].append(key.replace('_', ' '))

        for cat, entries in shown.items():
            if entries:
                core_lines.append(f"\n[{_CATEGORY_LABELS[cat]}]")
                core_lines.extend(f"• {e}" for e in entries)

        # 3. Key index for items not in core prompt
        index_keys = []
        for cat, keys in overflow.items():
            index_keys.extend(keys)
        if index_keys:
            index_str = ", ".join(index_keys[:12])
            core_lines.append(f"\n[Additional Knowledge Available via recall_memory]: {index_str}")

        return "\n".join(core_lines).strip()
