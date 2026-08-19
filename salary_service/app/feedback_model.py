from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any

from .salary_engine import ValidationError

POSITIVE = {
    "good", "great", "excellent", "helpful", "fast", "easy", "smooth", "love", "best", "satisfied",
    "happy", "clear", "friendly", "quick", "reliable", "အဆင်ပြေ", "ကောင်း", "မြန်", "ကျေနပ်", "သဘောကျ",
}
NEGATIVE = {
    "bad", "poor", "slow", "late", "delay", "difficult", "hard", "problem", "issue", "error", "failed",
    "expensive", "confusing", "angry", "unhappy", "worst", "မကောင်း", "နှေး", "အဆင်မပြေ", "ပြဿနာ", "ကြန့်ကြာ",
}
STOP = {"the","a","an","and","or","to","of","for","is","are","was","were","i","we","you","it","this","that","my","your","very","so","in","on","with","at","be","have","has"}


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in re.findall(r"[A-Za-z]+|[\u1000-\u109F]+", text or "")]


def _sentiment(message: str, rating: int | None) -> tuple[str, float, list[str]]:
    tokens = _tokens(message)
    pos = [t for t in tokens if t in POSITIVE]
    neg = [t for t in tokens if t in NEGATIVE]
    lex = len(pos) - len(neg)
    rating_signal = 0
    if rating is not None:
        rating_signal = 1 if rating >= 4 else (-1 if rating <= 2 else 0)
    score = lex + rating_signal * 0.75
    label = "POSITIVE" if score > 0.4 else "NEGATIVE" if score < -0.4 else "NEUTRAL"
    confidence = min(0.98, 0.55 + min(abs(score), 3) * 0.12)
    return label, round(confidence, 3), (pos + neg)[:8]


def analyze_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    rows = payload.get("feedbacks")
    if not isinstance(rows, list) or not rows:
        raise ValidationError("feedbacks must contain at least one feedback record")
    if len(rows) > 2000:
        raise ValidationError("feedbacks cannot exceed 2000 records per analysis")

    distribution = Counter()
    category_stats: dict[str, Counter] = defaultdict(Counter)
    themes = Counter()
    details = []
    agreement_total = 0
    agreement_matches = 0

    for row in rows:
        if not isinstance(row, dict):
            continue
        message = str(row.get("message") or "").strip()
        try:
            rating = int(row.get("rating")) if row.get("rating") is not None else None
        except (TypeError, ValueError):
            rating = None
        category = str(row.get("category") or "General").strip() or "General"
        label, confidence, matched = _sentiment(message, rating)
        distribution[label] += 1
        category_stats[category][label] += 1
        for token in _tokens(message):
            if len(token) >= 3 and token not in STOP and token not in POSITIVE and token not in NEGATIVE:
                themes[token] += 1
        if rating is not None and rating != 3:
            agreement_total += 1
            rating_label = "POSITIVE" if rating >= 4 else "NEGATIVE"
            if rating_label == label:
                agreement_matches += 1
        details.append({
            "id": row.get("id"), "rating": rating, "category": category, "sentiment": label,
            "confidence": confidence, "matched_terms": matched, "message_preview": message[:180],
        })

    total = sum(distribution.values()) or 1
    category_summary = []
    for category, counts in sorted(category_stats.items()):
        ct = sum(counts.values()) or 1
        category_summary.append({
            "category": category, "total": ct,
            "positive": counts["POSITIVE"], "neutral": counts["NEUTRAL"], "negative": counts["NEGATIVE"],
            "negative_percent": round(counts["NEGATIVE"] * 100 / ct, 2),
        })

    return {
        "analysis_type": "feedback_sentiment_and_theme_analysis",
        "model": {
            "method": "transparent_rating_plus_keyword_sentiment",
            "language_support": "English + common Myanmar feedback terms",
            "note": "This is an interpretable local text-analysis model; it does not use customer identity attributes.",
        },
        "summary": {
            "total_feedback": total,
            "positive": distribution["POSITIVE"], "neutral": distribution["NEUTRAL"], "negative": distribution["NEGATIVE"],
            "positive_percent": round(distribution["POSITIVE"] * 100 / total, 2),
            "negative_percent": round(distribution["NEGATIVE"] * 100 / total, 2),
        },
        "evaluation": {
            "method": "rating_text_consistency_check",
            "labeled_records": agreement_total,
            "agreement_rate_percent": round(agreement_matches * 100 / agreement_total, 2) if agreement_total else None,
            "important_note": "Ratings are a proxy, not ground-truth sentiment labels, so this is a consistency metric rather than formal model accuracy.",
        },
        "top_themes": [{"term": term, "count": count} for term, count in themes.most_common(12)],
        "category_summary": category_summary,
        "items": details[:200],
    }
