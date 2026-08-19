from __future__ import annotations

import json
from pathlib import Path
import re


RULES_FILE = Path(__file__).with_name("uni2zg.json")
ZAWGYI_ONLY = re.compile(r"[\u1060-\u1097]")


def _expand_unicode_escapes(value: str) -> str:
    return re.sub(
        r"\\u([0-9a-fA-F]{4})",
        lambda match: chr(int(match.group(1), 16)),
        value,
    )


def _python_replacement(value: str) -> str:
    expanded = _expand_unicode_escapes(value)
    return re.sub(r"\$([0-9]+)", r"\\g<\1>", expanded)


def _load_rules() -> tuple[tuple[re.Pattern[str], str], ...]:
    raw_rules = json.loads(RULES_FILE.read_text(encoding="utf-8"))
    return tuple(
        (re.compile(_expand_unicode_escapes(rule["from"])), _python_replacement(rule["to"]))
        for rule in raw_rules
    )


RULES = _load_rules()


def unicode_to_zawgyi(value: str | None) -> str | None:
    """Convert Unicode Myanmar to Zawgyi using Rabbit Converter 1.1.3 rules."""
    if value is None or not value or ZAWGYI_ONLY.search(value):
        return value
    output = value
    for pattern, replacement in RULES:
        output = pattern.sub(replacement, output)
    return output
