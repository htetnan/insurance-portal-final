from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "salary_service"))

from app.revenue_model import predict_revenue  # noqa: E402


def evaluate(input_csv: Path, output_json: Path, months: int = 6) -> dict:
    with input_csv.open(encoding="utf-8", newline="") as handle:
        points = [
            {"month": row["month"], "revenue": row["revenue"]}
            for row in csv.DictReader(handle)
        ]
    result = predict_revenue({
        "points": points,
        "currency": "MMK",
        "source": "synthetic_verified_premium_payments",
        "months_to_predict": months,
    })
    output_json.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a generated monthly revenue dataset")
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("output_json", type=Path)
    parser.add_argument("--months", type=int, default=6)
    args = parser.parse_args()
    result = evaluate(args.input_csv, args.output_json, args.months)
    print(json.dumps({"model": result["model"], "evaluation": result["evaluation"]}, indent=2))


if __name__ == "__main__":
    main()
