from __future__ import annotations

from typing import Any
from .salary_engine import ValidationError


def _num(v: Any) -> float | None:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def analyze_application_readiness(payload: dict[str, Any]) -> dict[str, Any]:
    app = payload.get("application")
    if not isinstance(app, dict):
        raise ValidationError("application must be an object")

    checks = []
    score = 100.0

    coverage = _num(app.get("coverage_amount"))
    coverage_min = _num(app.get("coverage_min"))
    coverage_max = _num(app.get("coverage_max"))
    if coverage is None:
        checks.append({"check": "Coverage amount", "status": "MISSING", "severity": "HIGH", "message": "Coverage amount is missing."}); score -= 25
    elif coverage_min is not None and coverage < coverage_min:
        checks.append({"check": "Coverage amount", "status": "REVIEW", "severity": "HIGH", "message": f"Coverage is below package minimum ({coverage_min:,.0f})."}); score -= 25
    elif coverage_max is not None and coverage > coverage_max:
        checks.append({"check": "Coverage amount", "status": "REVIEW", "severity": "HIGH", "message": f"Coverage exceeds package maximum ({coverage_max:,.0f})."}); score -= 25
    else:
        checks.append({"check": "Coverage amount", "status": "PASS", "severity": "LOW", "message": "Coverage is within configured package limits."})

    duration = _num(app.get("duration"))
    min_term = _num(app.get("min_policy_term"))
    max_term = _num(app.get("policy_term"))
    if duration is None:
        checks.append({"check": "Policy term", "status": "MISSING", "severity": "HIGH", "message": "Policy duration is missing."}); score -= 20
    elif (min_term is not None and duration < min_term) or (max_term is not None and duration > max_term):
        checks.append({"check": "Policy term", "status": "REVIEW", "severity": "HIGH", "message": "Requested duration is outside the configured policy term."}); score -= 20
    else:
        checks.append({"check": "Policy term", "status": "PASS", "severity": "LOW", "message": "Requested duration is within configured limits."})

    required_docs = max(0, int(_num(app.get("required_document_count")) or 0))
    uploaded_docs = max(0, int(_num(app.get("uploaded_document_count")) or 0))
    if required_docs and uploaded_docs < required_docs:
        missing = required_docs - uploaded_docs
        checks.append({"check": "Supporting documents", "status": "MISSING", "severity": "HIGH", "message": f"At least {missing} required document(s) may still be missing."}); score -= min(30, missing * 8)
    else:
        checks.append({"check": "Supporting documents", "status": "PASS", "severity": "LOW", "message": "Uploaded-document count meets the configured requirement."})

    total_fields = max(0, int(_num(app.get("form_field_count")) or 0))
    completed_fields = max(0, int(_num(app.get("completed_field_count")) or 0))
    completeness = 100.0 if total_fields == 0 else completed_fields * 100.0 / total_fields
    if completeness < 80:
        checks.append({"check": "Form completeness", "status": "MISSING", "severity": "MEDIUM", "message": f"Only {completeness:.1f}% of submitted form fields contain values."}); score -= 20
    elif completeness < 100:
        checks.append({"check": "Form completeness", "status": "REVIEW", "severity": "LOW", "message": f"Form is {completeness:.1f}% complete."}); score -= 5
    else:
        checks.append({"check": "Form completeness", "status": "PASS", "severity": "LOW", "message": "Submitted form fields are complete."})

    risk = str(app.get("risk_level") or "UNKNOWN").upper()
    if risk == "HIGH":
        checks.append({"check": "Existing risk flag", "status": "REVIEW", "severity": "HIGH", "message": "Existing system risk level is HIGH; manual underwriting review is required."}); score -= 15
    elif risk == "MEDIUM":
        checks.append({"check": "Existing risk flag", "status": "REVIEW", "severity": "MEDIUM", "message": "Existing system risk level is MEDIUM; review the underlying reason."}); score -= 7
    else:
        checks.append({"check": "Existing risk flag", "status": "PASS", "severity": "LOW", "message": f"Existing risk level: {risk}."})

    score = round(max(0.0, min(100.0, score)), 1)
    high_issue = any(c["severity"] == "HIGH" and c["status"] != "PASS" for c in checks)
    missing_issue = any(c["status"] == "MISSING" for c in checks)
    recommendation = "NEEDS_INFORMATION" if missing_issue else ("MANUAL_POLICY_REVIEW" if high_issue else "READY_FOR_HUMAN_REVIEW")

    return {
        "analysis_type": "application_readiness_decision_support",
        "application_id": app.get("id"),
        "readiness_score": score,
        "recommendation": recommendation,
        "form_completeness_percent": round(completeness, 1),
        "checks": checks,
        "evaluation": {
            "type": "deterministic_rule_validation",
            "rules_checked": len(checks),
            "passed": sum(1 for c in checks if c["status"] == "PASS"),
            "needs_review": sum(1 for c in checks if c["status"] == "REVIEW"),
            "missing": sum(1 for c in checks if c["status"] == "MISSING"),
            "note": "This module validates completeness and configured policy constraints; it is not an approval-probability model.",
        },
        "decision_boundary": "No automatic approval or rejection is produced. Final insurance eligibility and underwriting decisions must be made by authorized human reviewers using applicable policy rules.",
    }
