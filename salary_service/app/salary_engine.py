from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from math import sqrt
from typing import Any


MONEY = Decimal("0.01")


class ValidationError(ValueError):
    """Raised when an API payload contains invalid salary data."""


def _decimal(value: Any, field: str, minimum: str = "0", maximum: str | None = None) -> Decimal:
    try:
        number = Decimal(str(value))
    except Exception as exc:
        raise ValidationError(f"{field} must be a number") from exc
    if not number.is_finite():
        raise ValidationError(f"{field} must be finite")
    if number < Decimal(minimum):
        raise ValidationError(f"{field} must be at least {minimum}")
    if maximum is not None and number > Decimal(maximum):
        raise ValidationError(f"{field} must be at most {maximum}")
    return number


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def _number(value: Decimal) -> float:
    return float(_money(value))


@dataclass(frozen=True)
class SalaryInput:
    employee_name: str
    employee_id: str
    job_title: str
    currency: str
    base_salary: Decimal
    allowances: Decimal
    overtime_hours: Decimal
    overtime_rate: Decimal
    bonus: Decimal
    deductions: Decimal
    tax_rate: Decimal
    pension_rate: Decimal
    annual_growth_rate: Decimal
    performance_score: Decimal
    months_to_predict: int
    historical_net_salaries: tuple[Decimal, ...]

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SalaryInput":
        if not isinstance(payload, dict):
            raise ValidationError("Request body must be a JSON object")
        name = str(payload.get("employee_name", "")).strip()
        if not name or len(name) > 100:
            raise ValidationError("employee_name is required and must be 100 characters or fewer")
        employee_id = str(payload.get("employee_id", "")).strip()[:50]
        job_title = str(payload.get("job_title", "")).strip()[:100]
        currency = str(payload.get("currency", "MMK")).strip().upper()
        if len(currency) != 3 or not currency.isalpha():
            raise ValidationError("currency must be a three-letter code")

        try:
            months = int(payload.get("months_to_predict", 12))
        except (TypeError, ValueError) as exc:
            raise ValidationError("months_to_predict must be an integer") from exc
        if not 1 <= months <= 24:
            raise ValidationError("months_to_predict must be between 1 and 24")

        history_raw = payload.get("historical_net_salaries", [])
        if history_raw is None:
            history_raw = []
        if not isinstance(history_raw, list) or len(history_raw) > 36:
            raise ValidationError("historical_net_salaries must be a list with at most 36 values")
        history = tuple(_decimal(v, "historical_net_salaries item") for v in history_raw)

        return cls(
            employee_name=name,
            employee_id=employee_id,
            job_title=job_title,
            currency=currency,
            base_salary=_decimal(payload.get("base_salary", 0), "base_salary"),
            allowances=_decimal(payload.get("allowances", 0), "allowances"),
            overtime_hours=_decimal(payload.get("overtime_hours", 0), "overtime_hours", maximum="744"),
            overtime_rate=_decimal(payload.get("overtime_rate", 0), "overtime_rate"),
            bonus=_decimal(payload.get("bonus", 0), "bonus"),
            deductions=_decimal(payload.get("deductions", 0), "deductions"),
            tax_rate=_decimal(payload.get("tax_rate", 0), "tax_rate", maximum="100"),
            pension_rate=_decimal(payload.get("pension_rate", 0), "pension_rate", maximum="100"),
            annual_growth_rate=_decimal(payload.get("annual_growth_rate", 5), "annual_growth_rate", minimum="-50", maximum="100"),
            performance_score=_decimal(payload.get("performance_score", 3), "performance_score", minimum="1", maximum="5"),
            months_to_predict=months,
            historical_net_salaries=history,
        )


def calculate_salary(data: SalaryInput) -> dict[str, Any]:
    overtime_pay = data.overtime_hours * data.overtime_rate
    gross_salary = data.base_salary + data.allowances + overtime_pay + data.bonus
    tax = gross_salary * data.tax_rate / Decimal("100")
    pension = data.base_salary * data.pension_rate / Decimal("100")
    total_deductions = data.deductions + tax + pension
    net_salary = max(Decimal("0"), gross_salary - total_deductions)

    return {
        "currency": data.currency,
        "base_salary": _number(data.base_salary),
        "allowances": _number(data.allowances),
        "overtime_pay": _number(overtime_pay),
        "bonus": _number(data.bonus),
        "gross_salary": _number(gross_salary),
        "tax": _number(tax),
        "pension": _number(pension),
        "other_deductions": _number(data.deductions),
        "total_deductions": _number(total_deductions),
        "net_salary": _number(net_salary),
    }


def _linear_forecast(values: tuple[Decimal, ...], months: int) -> tuple[list[Decimal], float]:
    ys = [float(v) for v in values]
    xs = list(range(len(ys)))
    x_bar = sum(xs) / len(xs)
    y_bar = sum(ys) / len(ys)
    denominator = sum((x - x_bar) ** 2 for x in xs)
    slope = sum((x - x_bar) * (y - y_bar) for x, y in zip(xs, ys)) / denominator
    intercept = y_bar - slope * x_bar
    predictions = [Decimal(str(max(0.0, intercept + slope * x))) for x in range(len(ys), len(ys) + months)]

    fitted = [intercept + slope * x for x in xs]
    residual = sum((y - fit) ** 2 for y, fit in zip(ys, fitted))
    total = sum((y - y_bar) ** 2 for y in ys)
    r_squared = 1.0 if total == 0 and residual == 0 else max(0.0, 1.0 - residual / total) if total else 0.0
    return predictions, round(r_squared, 4)


def predict_salary(data: SalaryInput, current_net: Decimal) -> dict[str, Any]:
    if len(data.historical_net_salaries) >= 3:
        predicted, confidence = _linear_forecast(data.historical_net_salaries, data.months_to_predict)
        method = "linear_regression"
        explanation = "Ordinary least-squares trend based on the supplied historical net salaries."
    else:
        performance_adjustment = (data.performance_score - Decimal("3")) * Decimal("1.5")
        effective_annual_rate = data.annual_growth_rate + performance_adjustment
        monthly_rate = effective_annual_rate / Decimal("1200")
        predicted = [current_net * ((Decimal("1") + monthly_rate) ** month) for month in range(1, data.months_to_predict + 1)]
        confidence = None
        method = "growth_scenario"
        explanation = "Scenario projection using the annual growth rate and performance adjustment; it is not a guaranteed payroll outcome."

    rounded = [_money(v) for v in predicted]
    return {
        "method": method,
        "confidence_r_squared": confidence,
        "explanation": explanation,
        "months": [
            {"month": index + 1, "predicted_net_salary": float(value)}
            for index, value in enumerate(rounded)
        ],
        "average_predicted_net_salary": _number(sum(rounded, Decimal("0")) / Decimal(len(rounded))),
        "total_predicted_net_salary": _number(sum(rounded, Decimal("0"))),
    }


def analyze_salary(payload: dict[str, Any]) -> dict[str, Any]:
    data = SalaryInput.from_dict(payload)
    calculation = calculate_salary(data)
    forecast = predict_salary(data, Decimal(str(calculation["net_salary"])))
    return {
        "employee": {
            "name": data.employee_name,
            "id": data.employee_id,
            "job_title": data.job_title,
        },
        "calculation": calculation,
        "forecast": forecast,
        "disclaimer": "Forecasts are estimates for planning and must not replace approved payroll records.",
    }

