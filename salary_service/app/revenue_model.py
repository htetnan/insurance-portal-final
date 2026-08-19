from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from math import ceil, cos, pi, sin
from typing import Any

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .salary_engine import ValidationError


MONEY = Decimal("0.01")
MAX_HISTORY_MONTHS = 60


@dataclass(frozen=True)
class RevenuePoint:
    month: date
    revenue: Decimal


def _parse_month(value: Any) -> date:
    try:
        year_text, month_text = str(value).split("-", 1)
        return date(int(year_text), int(month_text), 1)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Each month must use YYYY-MM format") from exc


def _parse_revenue(value: Any) -> Decimal:
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError("Revenue values must be valid numbers") from exc
    if not number.is_finite() or number < 0:
        raise ValidationError("Revenue values must be finite and non-negative")
    return number


def _next_month(value: date) -> date:
    return date(
        value.year + (1 if value.month == 12 else 0),
        1 if value.month == 12 else value.month + 1,
        1,
    )


def _money(value: float) -> float:
    return float(Decimal(str(max(0.0, value))).quantize(MONEY, rounding=ROUND_HALF_UP))


def _round_metric(value: float | None, digits: int = 4) -> float | None:
    if value is None or not np.isfinite(value):
        return None
    return round(float(value), digits)


def _preprocess(raw_points: list[Any]) -> tuple[list[RevenuePoint], dict[str, Any]]:
    """Validate, aggregate, sort, fill gaps, and report data quality."""
    monthly_totals: dict[date, Decimal] = {}
    duplicate_records = 0
    for row in raw_points:
        if not isinstance(row, dict):
            raise ValidationError("Every point must be an object with month and revenue")
        month = _parse_month(row.get("month"))
        revenue = _parse_revenue(row.get("revenue"))
        if month in monthly_totals:
            duplicate_records += 1
        monthly_totals[month] = monthly_totals.get(month, Decimal("0")) + revenue

    first = min(monthly_totals)
    last = max(monthly_totals)
    completed: list[RevenuePoint] = []
    missing_months: list[str] = []
    cursor = first
    while cursor <= last:
        if cursor not in monthly_totals:
            missing_months.append(cursor.strftime("%Y-%m"))
        completed.append(RevenuePoint(cursor, monthly_totals.get(cursor, Decimal("0"))))
        cursor = _next_month(cursor)

    if len(completed) > MAX_HISTORY_MONTHS:
        raise ValidationError(f"The completed date range cannot exceed {MAX_HISTORY_MONTHS} months")

    values = np.asarray([float(point.revenue) for point in completed], dtype=float)
    outlier_months: list[str] = []
    if len(values) >= 4:
        q1, q3 = np.percentile(values, [25, 75])
        iqr = q3 - q1
        lower, upper = max(0.0, q1 - 1.5 * iqr), q3 + 1.5 * iqr
        outlier_months = [
            point.month.strftime("%Y-%m")
            for point, value in zip(completed, values)
            if value < lower or value > upper
        ]

    return completed, {
        "raw_records": len(raw_points),
        "processed_records": len(completed),
        "duplicates_merged": duplicate_records,
        "missing_months_filled": len(missing_months),
        "missing_months": missing_months,
        "outliers_detected": len(outlier_months),
        "outlier_months": outlier_months,
        "outlier_policy": "reported_only_not_removed",
        "steps": [
            "validate_month_and_non_negative_revenue",
            "aggregate_duplicate_months",
            "sort_chronologically",
            "fill_missing_months_with_zero",
            "detect_iqr_outliers_without_removing_them",
            "create_time_seasonal_and_lag_features",
        ],
    }


def _feature_names(record_count: int) -> list[str]:
    names = ["time_index"]
    if record_count >= 8:
        names.extend(["month_sin", "month_cos"])
    if record_count >= 12:
        names.extend(["previous_month_revenue", "rolling_3_month_average"])
    return names


def _candidate_feature_sets(record_count: int) -> list[tuple[str, list[str]]]:
    candidates = [("trend", ["time_index"])]
    if record_count >= 8:
        candidates.append(("trend_seasonal", ["time_index", "month_sin", "month_cos"]))
    if record_count >= 12:
        candidates.append((
            "trend_lag",
            ["time_index", "previous_month_revenue", "rolling_3_month_average"],
        ))
    if record_count >= 18:
        candidates.append(("trend_seasonal_lag", _feature_names(record_count)))
    return candidates


def _feature_row(index: int, month: date, values: list[float], names: list[str]) -> list[float]:
    row = [float(index)]
    if "month_sin" in names:
        angle = 2 * pi * (month.month - 1) / 12
        row.extend([sin(angle), cos(angle)])
    if "previous_month_revenue" in names:
        previous = values[index - 1] if index > 0 else values[0]
        previous_window = values[max(0, index - 3):index] or [values[0]]
        row.extend([previous, sum(previous_window) / len(previous_window)])
    return row


def _feature_matrix(points: list[RevenuePoint], values: list[float], names: list[str]) -> np.ndarray:
    return np.asarray(
        [_feature_row(index, point.month, values, names) for index, point in enumerate(points)],
        dtype=float,
    )


def _mape(actual: np.ndarray, predicted: np.ndarray) -> float | None:
    non_zero = actual != 0
    if not np.any(non_zero):
        return None
    return float(np.mean(np.abs((actual[non_zero] - predicted[non_zero]) / actual[non_zero])) * 100)


def _evaluate(
    points: list[RevenuePoint], values: list[float], features: np.ndarray, holdout_size: int
) -> dict[str, Any]:
    split = len(points) - holdout_size
    validation_model = LinearRegression().fit(features[:split], np.asarray(values[:split], dtype=float))
    actual = np.asarray(values[split:], dtype=float)
    predicted = np.maximum(0.0, validation_model.predict(features[split:]))
    baseline = np.asarray([values[index - 1] for index in range(split, len(values))], dtype=float)

    mae = float(mean_absolute_error(actual, predicted))
    rmse = float(mean_squared_error(actual, predicted) ** 0.5)
    baseline_mae = float(mean_absolute_error(actual, baseline))
    r_squared = None
    if len(actual) >= 2 and not np.allclose(actual, actual[0]):
        r_squared = float(r2_score(actual, predicted))

    return {
        "method": "chronological_one_step_holdout",
        "train_records": split,
        "test_records": holdout_size,
        "mae": _money(mae),
        "rmse": _money(rmse),
        "r_squared": _round_metric(r_squared),
        "mape_percent": _round_metric(_mape(actual, predicted), 2),
        "baseline": "previous_month_revenue",
        "baseline_mae": _money(baseline_mae),
        "beats_baseline": mae <= baseline_mae,
        "holdout_results": [
            {
                "month": points[index].month.strftime("%Y-%m"),
                "actual": _money(values[index]),
                "predicted": _money(predicted[index - split]),
            }
            for index in range(split, len(points))
        ],
    }


def predict_revenue(payload: dict[str, Any]) -> dict[str, Any]:
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

    values = [float(point.revenue) for point in points]
    holdout_size = min(6, max(1, ceil(len(points) * 0.25)), len(points) - 2)

    candidates: list[dict[str, Any]] = []
    for candidate_name, candidate_features in _candidate_feature_sets(len(points)):
        candidate_matrix = _feature_matrix(points, values, candidate_features)
        candidate_evaluation = _evaluate(points, values, candidate_matrix, holdout_size)
        candidates.append({
            "name": candidate_name,
            "features": candidate_features,
            "features_matrix": candidate_matrix,
            "evaluation": candidate_evaluation,
        })
    selected = min(candidates, key=lambda candidate: candidate["evaluation"]["mae"])
    names = selected["features"]
    features = selected["features_matrix"]
    evaluation = selected["evaluation"]
    evaluation["model_comparison"] = [
        {
            "name": candidate["name"],
            "features": candidate["features"],
            "mae": candidate["evaluation"]["mae"],
            "rmse": candidate["evaluation"]["rmse"],
            "r_squared": candidate["evaluation"]["r_squared"],
        }
        for candidate in candidates
    ]

    final_model = LinearRegression().fit(features, np.asarray(values, dtype=float))
    fitted = final_model.predict(features)
    training_r2 = (
        1.0
        if np.allclose(values, values[0]) and np.allclose(fitted, values)
        else float(r2_score(values, fitted))
    )
    trend_model = LinearRegression().fit(
        np.arange(len(values), dtype=float).reshape(-1, 1), np.asarray(values, dtype=float)
    )
    monthly_trend = float(trend_model.coef_[0])

    future_values = list(values)
    future_month = _next_month(points[-1].month)
    predictions: list[dict[str, Any]] = []
    uncertainty = float(evaluation["rmse"]) * 1.96
    for offset in range(months_to_predict):
        future_index = len(points) + offset
        row = np.asarray([_feature_row(future_index, future_month, future_values, names)], dtype=float)
        estimate = max(0.0, float(final_model.predict(row)[0]))
        predictions.append({
            "month": future_month.strftime("%Y-%m"),
            "predicted_revenue": _money(estimate),
            "lower_bound": _money(estimate - uncertainty),
            "upper_bound": _money(estimate + uncertainty),
        })
        future_values.append(estimate)
        future_month = _next_month(future_month)

    return {
        "model": {
            "name": "linear_regression_time_series",
            "version": "2.0",
            "library": "scikit-learn",
            "selected_candidate": selected["name"],
            "selection_metric": "holdout_mae",
            "training_records": len(points),
            "evaluation_records": holdout_size,
            "features": names,
            "r_squared": evaluation["r_squared"],
            "training_r_squared": _round_metric(training_r2),
            "rmse": evaluation["rmse"],
            "monthly_trend": _money(monthly_trend),
        },
        "data_source": str(payload.get("source", "verified_premium_payments")),
        "currency": str(payload.get("currency", "MMK")).upper()[:3],
        "preprocessing": preprocessing,
        "evaluation": evaluation,
        "history": [
            {"month": point.month.strftime("%Y-%m"), "revenue": float(point.revenue)}
            for point in points
        ],
        "predictions": predictions,
        "disclaimer": (
            "Revenue predictions are planning estimates based only on historical verified "
            "premium payments. They must not be used to approve or reject an individual policy or claim."
        ),
    }
