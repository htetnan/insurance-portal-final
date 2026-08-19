from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from math import ceil, cos, pi, sin
from typing import Any

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .salary_engine import ValidationError

MAX_HISTORY_MONTHS = 60
SUPPORTED_METRICS = {
    "applications": "Applications",
    "claims": "Claims",
    "payments": "Payments",
}


@dataclass(frozen=True)
class CountPoint:
    month: date
    value: float


def _parse_month(value: Any) -> date:
    try:
        year_text, month_text = str(value).split("-", 1)
        return date(int(year_text), int(month_text), 1)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Each month must use YYYY-MM format") from exc


def _next_month(value: date) -> date:
    return date(value.year + (value.month == 12), 1 if value.month == 12 else value.month + 1, 1)


def _parse_value(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Monthly values must be valid numbers") from exc
    if not np.isfinite(parsed) or parsed < 0:
        raise ValidationError("Monthly values must be finite and non-negative")
    return parsed


def _preprocess(raw_points: list[Any]) -> tuple[list[CountPoint], dict[str, Any]]:
    totals: dict[date, float] = {}
    duplicate_records = 0
    for row in raw_points:
        if not isinstance(row, dict):
            raise ValidationError("Every point must be an object with month and value")
        month = _parse_month(row.get("month"))
        value = _parse_value(row.get("value"))
        if month in totals:
            duplicate_records += 1
        totals[month] = totals.get(month, 0.0) + value

    first, last = min(totals), max(totals)
    completed: list[CountPoint] = []
    missing_months: list[str] = []
    cursor = first
    while cursor <= last:
        if cursor not in totals:
            missing_months.append(cursor.strftime("%Y-%m"))
        completed.append(CountPoint(cursor, totals.get(cursor, 0.0)))
        cursor = _next_month(cursor)

    if len(completed) > MAX_HISTORY_MONTHS:
        raise ValidationError(f"The completed date range cannot exceed {MAX_HISTORY_MONTHS} months")

    values = np.asarray([point.value for point in completed], dtype=float)
    outliers: list[str] = []
    if len(values) >= 4:
        q1, q3 = np.percentile(values, [25, 75])
        iqr = q3 - q1
        lower, upper = max(0.0, q1 - 1.5 * iqr), q3 + 1.5 * iqr
        outliers = [p.month.strftime("%Y-%m") for p, v in zip(completed, values) if v < lower or v > upper]

    return completed, {
        "raw_records": len(raw_points),
        "processed_records": len(completed),
        "duplicates_merged": duplicate_records,
        "missing_months_filled": len(missing_months),
        "missing_months": missing_months,
        "outliers_detected": len(outliers),
        "outlier_months": outliers,
        "outlier_policy": "reported_only_not_removed",
        "steps": [
            "validate_month_and_non_negative_value",
            "aggregate_duplicate_months",
            "sort_chronologically",
            "fill_missing_months_with_zero",
            "detect_iqr_outliers_without_removing_them",
            "create_time_seasonal_and_lag_features",
        ],
    }


def _candidate_sets(record_count: int) -> list[tuple[str, list[str]]]:
    result = [("trend", ["time_index"])]
    if record_count >= 8:
        result.append(("trend_seasonal", ["time_index", "month_sin", "month_cos"]))
    if record_count >= 12:
        result.append(("trend_lag", ["time_index", "previous_month_value", "rolling_3_month_average"]))
    if record_count >= 18:
        result.append(("trend_seasonal_lag", ["time_index", "month_sin", "month_cos", "previous_month_value", "rolling_3_month_average"]))
    return result


def _row(index: int, month: date, values: list[float], names: list[str]) -> list[float]:
    row = [float(index)]
    if "month_sin" in names:
        angle = 2 * pi * (month.month - 1) / 12
        row.extend([sin(angle), cos(angle)])
    if "previous_month_value" in names:
        previous = values[index - 1] if index else values[0]
        window = values[max(0, index - 3):index] or [values[0]]
        row.extend([previous, sum(window) / len(window)])
    return row


def _matrix(points: list[CountPoint], values: list[float], names: list[str]) -> np.ndarray:
    return np.asarray([_row(i, p.month, values, names) for i, p in enumerate(points)], dtype=float)


def _mape(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    mask = actual != 0
    if not np.any(mask):
        return None
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def _round(value: float | None, digits: int = 3) -> float | None:
    return None if value is None or not np.isfinite(value) else round(float(value), digits)


def _evaluate(points: list[CountPoint], values: list[float], features: np.ndarray, holdout: int) -> dict[str, Any]:
    split = len(points) - holdout
    model = LinearRegression().fit(features[:split], np.asarray(values[:split], dtype=float))
    actual = np.asarray(values[split:], dtype=float)
    predicted = np.maximum(0.0, model.predict(features[split:]))
    baseline = np.asarray([values[i - 1] for i in range(split, len(values))], dtype=float)
    mae = float(mean_absolute_error(actual, predicted))
    baseline_mae = float(mean_absolute_error(actual, baseline))
    r2 = None if len(actual) < 2 or np.allclose(actual, actual[0]) else float(r2_score(actual, predicted))
    return {
        "method": "chronological_holdout",
        "train_records": split,
        "test_records": holdout,
        "mae": _round(mae, 2),
        "rmse": _round(float(mean_squared_error(actual, predicted) ** 0.5), 2),
        "r_squared": _round(r2, 4),
        "mape_percent": _round(_mape(actual, predicted), 2),
        "baseline": "previous_month_value",
        "baseline_mae": _round(baseline_mae, 2),
        "beats_baseline": mae <= baseline_mae,
        "holdout_results": [
            {"month": points[i].month.strftime("%Y-%m"), "actual": round(values[i], 2), "predicted": round(float(predicted[i - split]), 2)}
            for i in range(split, len(points))
        ],
    }


def predict_operational(payload: dict[str, Any]) -> dict[str, Any]:
    metric = str(payload.get("metric", "")).strip().lower()
    if metric not in SUPPORTED_METRICS:
        raise ValidationError("metric must be one of: applications, claims, payments")
    raw_points = payload.get("points")
    if not isinstance(raw_points, list) or not 3 <= len(raw_points) <= MAX_HISTORY_MONTHS:
        raise ValidationError(f"points must contain between 3 and {MAX_HISTORY_MONTHS} monthly records")
    try:
        months_to_predict = int(payload.get("months_to_predict", 6))
    except (TypeError, ValueError) as exc:
        raise ValidationError("months_to_predict must be an integer") from exc
    if not 1 <= months_to_predict <= 12:
        raise ValidationError("months_to_predict must be between 1 and 12")

    points, preprocessing = _preprocess(raw_points)
    if len(points) < 3:
        raise ValidationError("The completed history must contain at least three months")
    values = [p.value for p in points]
    holdout = min(6, max(1, ceil(len(points) * 0.25)), len(points) - 2)

    candidates = []
    for name, names in _candidate_sets(len(points)):
        matrix = _matrix(points, values, names)
        evaluation = _evaluate(points, values, matrix, holdout)
        candidates.append((name, names, matrix, evaluation))
    selected_name, selected_features, matrix, evaluation = min(candidates, key=lambda c: c[3]["mae"])
    evaluation["model_comparison"] = [
        {"name": name, "features": names, "mae": ev["mae"], "rmse": ev["rmse"], "r_squared": ev["r_squared"]}
        for name, names, _, ev in candidates
    ]

    model = LinearRegression().fit(matrix, np.asarray(values, dtype=float))
    fitted = model.predict(matrix)
    residual_std = float(np.std(np.asarray(values) - fitted)) if len(values) > 2 else 0.0

    future_values = list(values)
    month = points[-1].month
    predictions = []
    for step in range(months_to_predict):
        month = _next_month(month)
        index = len(values) + step
        features = np.asarray([_row(index, month, future_values, selected_features)], dtype=float)
        predicted = max(0.0, float(model.predict(features)[0]))
        future_values.append(predicted)
        margin = 1.96 * residual_std
        predictions.append({
            "month": month.strftime("%Y-%m"),
            "predicted_value": round(predicted, 2),
            "rounded_count": int(round(predicted)),
            "lower_bound": round(max(0.0, predicted - margin), 2),
            "upper_bound": round(predicted + margin, 2),
        })

    return {
        "metric": metric,
        "metric_label": SUPPORTED_METRICS[metric],
        "unit": "records",
        "model": {
            "algorithm": "scikit-learn LinearRegression candidate selection",
            "selected_candidate": selected_name,
            "selection_metric": "holdout_mae",
            "features": selected_features,
        },
        "preprocessing": preprocessing,
        "evaluation": evaluation,
        "history": [{"month": p.month.strftime("%Y-%m"), "value": round(p.value, 2)} for p in points],
        "predictions": predictions,
        "disclaimer": "Aggregate operational forecast for planning only; it must not be used to automatically approve, reject, price, or adjudicate an individual insurance application or claim.",
    }
