from __future__ import annotations

import argparse
import calendar
import csv
import json
import math
import random
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable


DEFAULT_SEED = 20260812
END_MONTH = date(2026, 8, 1)
HISTORY_MONTHS = 60
SYNTHETIC_PASSWORD = "!SYNTHETIC-NO-LOGIN!"

TABLE_COLUMNS = {
    "users": ["id", "active", "address", "created_at", "email", "insurance_type", "name", "password", "phone", "profile_picture", "role", "updated_at"],
    "insurance_types": ["id", "created_at", "name", "description", "benefits", "rules"],
    "insurance_packages": ["id", "active", "beneficiary_info", "benefits", "coverage_max", "coverage_min", "created_at", "description", "duration_tiers", "eligibility", "exclusions", "max_claim_amount", "min_policy_term", "name", "payment_frequency", "payment_interval_months", "policy_term", "premium_rate", "required_documents", "terms_and_conditions", "type", "updated_at"],
    "policy_applications": ["id", "admin_note", "admin_signature", "admin_signed_at", "agent_note", "agent_signature", "agent_signed_at", "common_info", "coverage_amount", "created_at", "documents_path", "duration", "extra_info", "form_data", "notes", "policy_number", "premium_amount", "revision_deadline", "risk_level", "status", "updated_at", "agent_id", "customer_id", "package_id"],
    "payments": ["id", "amount", "created_at", "notes", "payment_method", "payment_type", "period_label", "period_number", "screenshot_path", "status", "transaction_amount", "transaction_last_six_digits", "updated_at", "verified_by", "application_id", "customer_id"],
    "claims": ["id", "admin_note", "admin_signature", "admin_signed_at", "agent_note", "agent_signature", "agent_signed_at", "amount", "claim_type", "created_at", "description", "documents_path", "form_data", "incident_date", "revision_deadline", "status", "updated_at", "agent_id", "application_id", "customer_id"],
    "feedbacks": ["id", "category", "created_at", "message", "rating", "is_read", "customer_id"],
    "notifications": ["id", "created_at", "message", "is_read", "target_role", "title", "type", "recipient_id"],
    "auto_check_logs": ["id", "affected_count", "ai_assisted", "check_type", "created_at", "details", "status", "summary", "total_checked"],
}

SCALABLE_TABLES = ["users", "policy_applications", "payments", "claims", "feedbacks", "notifications", "auto_check_logs"]


def profile_counts(profile: str, size: int) -> dict[str, int]:
    if size < 10:
        raise ValueError("size must be at least 10")
    if profile == "balanced":
        weights = {
            "users": 2500,
            "policy_applications": 3500,
            "payments": 6000,
            "claims": 1000,
            "feedbacks": 750,
            "notifications": 750,
            "auto_check_logs": 500,
        }
        counts = {name: round(size * value / 15000) for name, value in weights.items()}
        counts["payments"] += size - sum(counts.values())
        counts["salary_training"] = max(100, size // 30)
        return counts
    if profile == "revenue":
        return {
            "users": max(200, size // 5),
            "policy_applications": max(500, size // 3),
            "payments": size,
            "claims": 0,
            "feedbacks": 0,
            "notifications": 0,
            "auto_check_logs": 0,
            "salary_training": 0,
        }
    if profile == "full":
        return {**{name: size for name in SCALABLE_TABLES}, "salary_training": size}
    raise ValueError(f"Unknown profile: {profile}")


def shift_month(value: date, offset: int) -> date:
    absolute = value.year * 12 + value.month - 1 + offset
    return date(absolute // 12, absolute % 12 + 1, 1)


def random_datetime(rng: random.Random, month_index: int | None = None) -> datetime:
    if month_index is None:
        month_index = rng.randrange(HISTORY_MONTHS)
    month = shift_month(END_MONTH, -(HISTORY_MONTHS - 1 - month_index))
    day = rng.randint(1, calendar.monthrange(month.year, month.month)[1])
    return datetime(month.year, month.month, day, rng.randint(0, 23), rng.randint(0, 59), rng.randint(0, 59))


def dt(value: datetime | None) -> str | None:
    return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


def weighted(rng: random.Random, values: list[str], weights: list[int]) -> str:
    return rng.choices(values, weights=weights, k=1)[0]


def reference_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    now = "2026-08-01 00:00:00"
    type_names = ["LIFE", "HEALTH", "MOTOR", "TRAVEL", "PROPERTY", "PERSONAL_ACCIDENT"]
    types = [
        {
            "id": 9001 + index,
            "created_at": now,
            "name": f"SYNTHETIC_{name}",
            "description": f"Synthetic {name.lower()} insurance data for development and model evaluation.",
            "benefits": "Synthetic coverage benefits; not a real insurance product.",
            "rules": "Development and education use only.",
        }
        for index, name in enumerate(type_names)
    ]
    packages = []
    for index in range(24):
        insurance_type = type_names[index % len(type_names)]
        coverage_min = 1_000_000 + (index % 4) * 500_000
        coverage_max = coverage_min * (10 + index % 5)
        rate = 0.0125 + (index % 6) * 0.0025
        packages.append({
            "id": 9101 + index,
            "active": 1,
            "beneficiary_info": "Synthetic beneficiary details required",
            "benefits": json.dumps(["Synthetic base coverage", "Synthetic emergency support"]),
            "coverage_max": f"{coverage_max:.2f}",
            "coverage_min": f"{coverage_min:.2f}",
            "created_at": now,
            "description": f"Synthetic {insurance_type.lower()} package {index + 1}",
            "duration_tiers": json.dumps([1, 3, 5, 10]),
            "eligibility": "Synthetic customers aged 18 or above",
            "exclusions": "Synthetic exclusions apply",
            "max_claim_amount": f"{coverage_max * 0.8:.2f}",
            "min_policy_term": 1,
            "name": f"Synthetic {insurance_type.title()} Plan {index + 1}",
            "payment_frequency": ["MONTHLY", "QUARTERLY", "ANNUAL"][index % 3],
            "payment_interval_months": [1, 3, 12][index % 3],
            "policy_term": [1, 3, 5, 10][index % 4],
            "premium_rate": f"{rate:.4f}",
            "required_documents": json.dumps(["Synthetic ID", "Synthetic application form"]),
            "terms_and_conditions": "Synthetic records are not legally valid policies.",
            "type": insurance_type,
            "updated_at": now,
        })
    return types, packages


def generate_users(count: int, rng: random.Random) -> list[dict[str, Any]]:
    rows = []
    agent_count = max(1, count // 10)
    for index in range(count):
        user_id = 100000 + index
        role = "ADMIN" if index == 0 else "AGENT" if index <= agent_count else "CUSTOMER"
        created = random_datetime(rng)
        role_key = role.lower()
        rows.append({
            "id": user_id,
            "active": 0 if index % 37 == 0 else 1,
            "address": f"Synthetic Township {index % 60 + 1}, Myanmar",
            "created_at": dt(created),
            "email": f"synthetic.{role_key}.{index + 1:06d}@example.invalid",
            "insurance_type": ["LIFE", "HEALTH", "MOTOR", "TRAVEL", "PROPERTY", "PERSONAL_ACCIDENT"][index % 6] if role == "AGENT" else None,
            "name": f"Synthetic {role.title()} {index + 1:06d}",
            "password": SYNTHETIC_PASSWORD,
            "phone": f"+959{index + 1:09d}",
            "profile_picture": None,
            "role": role,
            "updated_at": dt(created + timedelta(days=rng.randint(0, 120))),
        })
    return rows


def generate_applications(count: int, users: list[dict[str, Any]], packages: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
    customers = [row["id"] for row in users if row["role"] == "CUSTOMER"]
    agents = [row["id"] for row in users if row["role"] == "AGENT"]
    rows = []
    statuses = ["PENDING", "VERIFIED", "APPROVED", "REJECTED", "CANCELLED", "REVISION_REQUESTED"]
    for index in range(count):
        application_id = 200000 + index
        package = packages[index % len(packages)]
        created = random_datetime(rng)
        coverage_min = float(package["coverage_min"])
        coverage_max = float(package["coverage_max"])
        coverage = round(rng.uniform(coverage_min, coverage_max), 2)
        rate = float(package["premium_rate"])
        premium = round(coverage * rate / 12, 2)
        status = weighted(rng, statuses, [10, 20, 38, 12, 5, 15])
        approved = status == "APPROVED"
        revision_deadline = created + timedelta(days=7) if status == "REVISION_REQUESTED" else None
        rows.append({
            "id": application_id,
            "admin_note": "Synthetic admin review completed" if status in {"APPROVED", "REJECTED"} else None,
            "admin_signature": None,
            "admin_signed_at": dt(created + timedelta(days=4)) if approved else None,
            "agent_note": "Synthetic agent verification" if status in {"VERIFIED", "APPROVED"} else None,
            "agent_signature": None,
            "agent_signed_at": dt(created + timedelta(days=2)) if status in {"VERIFIED", "APPROVED"} else None,
            "common_info": json.dumps({"synthetic": True, "occupation_group": f"GROUP_{index % 12 + 1}"}),
            "coverage_amount": f"{coverage:.2f}",
            "created_at": dt(created),
            "documents_path": "[]",
            "duration": [1, 3, 5, 10][index % 4],
            "extra_info": json.dumps({"data_source": "synthetic_generator"}),
            "form_data": json.dumps({"synthetic": True, "risk_answers_complete": index % 13 != 0}),
            "notes": "Synthetic application generated for testing",
            "policy_number": f"SYN-POL-{application_id}" if approved else None,
            "premium_amount": f"{premium:.2f}",
            "revision_deadline": dt(revision_deadline),
            "risk_level": weighted(rng, ["LOW", "MEDIUM", "HIGH"], [55, 35, 10]),
            "status": status,
            "updated_at": dt(created + timedelta(days=rng.randint(1, 12))),
            "agent_id": agents[index % len(agents)],
            "customer_id": customers[index % len(customers)],
            "package_id": package["id"],
        })
    return rows


def generate_payments(count: int, applications: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
    rows = []
    for index in range(count):
        application = applications[index % len(applications)]
        month_index = index % HISTORY_MONTHS
        created = random_datetime(rng, month_index)
        base = float(application["premium_amount"])
        season = 1 + 0.08 * math.sin(2 * math.pi * (created.month - 1) / 12)
        trend = 1 + month_index * 0.004
        amount = round(max(1000, base * season * trend * rng.uniform(0.9, 1.1)), 2)
        status = weighted(rng, ["VERIFIED", "PENDING", "REJECTED"], [82, 12, 6])
        payment_type = weighted(rng, ["PREMIUM", "RENEWAL", "CLAIM_PAYOUT"], [78, 17, 5])
        rows.append({
            "id": 300000 + index,
            "amount": f"{amount:.2f}",
            "created_at": dt(created),
            "notes": "Synthetic payment record",
            "payment_method": ["KBZ_PAY", "WAVE_PAY", "AYA_PAY", "BANK_TRANSFER"][index % 4],
            "payment_type": payment_type,
            "period_label": created.strftime("%Y-%m"),
            "period_number": index % 12 + 1,
            "screenshot_path": None,
            "status": status,
            "transaction_amount": f"{amount:.2f}",
            "transaction_last_six_digits": f"{index % 1000000:06d}",
            "updated_at": dt(created + timedelta(days=rng.randint(0, 3))),
            "verified_by": "synthetic-generator" if status == "VERIFIED" else None,
            "application_id": application["id"],
            "customer_id": application["customer_id"],
        })
    return rows


def generate_claims(count: int, applications: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
    eligible = [row for row in applications if row["status"] in {"APPROVED", "VERIFIED"}] or applications
    rows = []
    for index in range(count):
        application = eligible[index % len(eligible)]
        created = random_datetime(rng)
        amount = round(float(application["coverage_amount"]) * rng.uniform(0.02, 0.45), 2)
        status = weighted(rng, ["PENDING", "VERIFIED", "APPROVED", "REJECTED", "REVISION_REQUESTED"], [18, 22, 40, 12, 8])
        rows.append({
            "id": 400000 + index,
            "admin_note": "Synthetic claim review" if status in {"APPROVED", "REJECTED"} else None,
            "admin_signature": None,
            "admin_signed_at": dt(created + timedelta(days=5)) if status == "APPROVED" else None,
            "agent_note": "Synthetic claim verification" if status in {"VERIFIED", "APPROVED"} else None,
            "agent_signature": None,
            "agent_signed_at": dt(created + timedelta(days=2)) if status in {"VERIFIED", "APPROVED"} else None,
            "amount": f"{amount:.2f}",
            "claim_type": ["ACCIDENT", "MEDICAL", "PROPERTY_DAMAGE", "TRAVEL_DELAY", "OTHER"][index % 5],
            "created_at": dt(created),
            "description": "Synthetic claim generated for development and analytics",
            "documents_path": "[]",
            "form_data": json.dumps({"synthetic": True, "documents_complete": index % 11 != 0}),
            "incident_date": (created.date() - timedelta(days=rng.randint(1, 90))).isoformat(),
            "revision_deadline": dt(created + timedelta(days=7)) if status == "REVISION_REQUESTED" else None,
            "status": status,
            "updated_at": dt(created + timedelta(days=rng.randint(1, 10))),
            "agent_id": application["agent_id"],
            "application_id": application["id"],
            "customer_id": application["customer_id"],
        })
    return rows


def generate_feedbacks(count: int, users: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
    customers = [row["id"] for row in users if row["role"] == "CUSTOMER"]
    categories = ["SERVICE", "PAYMENT", "CLAIM", "APPLICATION", "PORTAL"]
    return [
        {
            "id": 500000 + index,
            "category": categories[index % len(categories)],
            "created_at": dt(random_datetime(rng)),
            "message": f"Synthetic feedback message {index + 1}; no real customer data.",
            "rating": index % 5 + 1,
            "is_read": 0 if index % 4 == 0 else 1,
            "customer_id": customers[index % len(customers)],
        }
        for index in range(count)
    ]


def generate_notifications(count: int, users: list[dict[str, Any]], rng: random.Random) -> list[dict[str, Any]]:
    types = ["INFO", "APPROVAL", "REJECTION", "PAYMENT", "CLAIM", "REMINDER"]
    return [
        {
            "id": 600000 + index,
            "created_at": dt(random_datetime(rng)),
            "message": f"Synthetic notification {index + 1} for system testing.",
            "is_read": 0 if index % 3 == 0 else 1,
            "target_role": users[index % len(users)]["role"],
            "title": f"Synthetic {types[index % len(types)].title()} Notification",
            "type": types[index % len(types)],
            "recipient_id": users[index % len(users)]["id"],
        }
        for index in range(count)
    ]


def generate_logs(count: int, rng: random.Random) -> list[dict[str, Any]]:
    checks = ["APPLICATION", "CLAIM", "PAYMENT", "REVISION_CLEANUP"]
    return [
        {
            "id": 700000 + index,
            "affected_count": index % 17,
            "ai_assisted": 1 if index % 5 == 0 else 0,
            "check_type": checks[index % len(checks)],
            "created_at": dt(random_datetime(rng)),
            "details": json.dumps({"synthetic": True, "batch": index // 100}),
            "status": "SUCCESS" if index % 29 else "PARTIAL",
            "summary": "Synthetic automated check",
            "total_checked": 25 + index % 500,
        }
        for index in range(count)
    ]


def generate_salary(count: int, rng: random.Random) -> list[dict[str, Any]]:
    departments = ["Claims", "Policy", "Finance", "Customer Service", "IT", "Sales"]
    roles = ["Assistant", "Officer", "Senior Officer", "Team Lead", "Manager"]
    rows = []
    for index in range(count):
        experience = index % 21
        performance = round(1 + (index % 41) / 10, 1)
        base = 280000 + experience * 28000 + roles.index(roles[index % len(roles)]) * 65000
        net = round(base * (0.86 + performance * 0.018) + rng.uniform(-25000, 25000), 2)
        rows.append({
            "employee_id": f"SYN-EMP-{index + 1:06d}",
            "department": departments[index % len(departments)],
            "job_title": roles[index % len(roles)],
            "years_experience": experience,
            "performance_score": performance,
            "base_salary": f"{base:.2f}",
            "allowances": f"{base * 0.08:.2f}",
            "overtime_hours": index % 25,
            "bonus": f"{base * (index % 6) / 100:.2f}",
            "tax_rate": 5 + index % 6,
            "pension_rate": 2,
            "net_salary": f"{max(0, net):.2f}",
            "record_month": shift_month(END_MONTH, -(index % HISTORY_MONTHS)).strftime("%Y-%m"),
            "synthetic": True,
        })
    return rows


def write_csv(path: Path, rows: list[dict[str, Any]], columns: list[str] | None = None) -> None:
    if not rows:
        return
    fieldnames = columns or list(rows[0].keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def sql_value(value: Any) -> str:
    if value is None or value == "":
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    return "'" + text.replace("\\", "\\\\").replace("'", "''") + "'"


def write_sql(path: Path, tables: list[tuple[str, list[dict[str, Any]]]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write("-- Synthetic insurance data. Import only into a fresh development database.\n")
        handle.write("-- This file never deletes or truncates existing records.\n")
        handle.write("USE `insurance_portal`;\nSET NAMES utf8mb4;\nSTART TRANSACTION;\n")
        for table, rows in tables:
            if not rows:
                continue
            columns = TABLE_COLUMNS[table]
            quoted_columns = ",".join(f"`{column}`" for column in columns)
            for start in range(0, len(rows), 500):
                chunk = rows[start:start + 500]
                handle.write(f"INSERT INTO `{table}` ({quoted_columns}) VALUES\n")
                values = ["(" + ",".join(sql_value(row.get(column)) for column in columns) + ")" for row in chunk]
                handle.write(",\n".join(values) + ";\n")
        handle.write("COMMIT;\n")


def aggregate_revenue(payments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[str, float] = defaultdict(float)
    verified_counts: dict[str, int] = defaultdict(int)
    excluded_counts: dict[str, int] = defaultdict(int)
    for payment in payments:
        month = str(payment["created_at"])[:7]
        if payment["status"] == "VERIFIED" and payment["payment_type"] != "CLAIM_PAYOUT":
            totals[month] += float(payment["amount"])
            verified_counts[month] += 1
        else:
            excluded_counts[month] += 1
    rows = []
    for offset in range(-(HISTORY_MONTHS - 1), 1):
        month = shift_month(END_MONTH, offset).strftime("%Y-%m")
        rows.append({
            "month": month,
            "revenue": f"{totals[month]:.2f}",
            "verified_premium_payment_count": verified_counts[month],
            "excluded_payment_count": excluded_counts[month],
        })
    return rows


def validate_relationships(tables: dict[str, list[dict[str, Any]]]) -> None:
    user_ids = {row["id"] for row in tables["users"]}
    customer_ids = {row["id"] for row in tables["users"] if row["role"] == "CUSTOMER"}
    agent_ids = {row["id"] for row in tables["users"] if row["role"] == "AGENT"}
    package_ids = {row["id"] for row in tables["insurance_packages"]}
    app_by_id = {row["id"]: row for row in tables["policy_applications"]}
    assert all(row["customer_id"] in customer_ids and row["agent_id"] in agent_ids and row["package_id"] in package_ids for row in tables["policy_applications"])
    assert all(row["application_id"] in app_by_id and row["customer_id"] == app_by_id[row["application_id"]]["customer_id"] for row in tables["payments"])
    assert all(row["application_id"] in app_by_id and row["customer_id"] == app_by_id[row["application_id"]]["customer_id"] for row in tables["claims"])
    assert all(row["customer_id"] in customer_ids for row in tables["feedbacks"])
    assert all(row["recipient_id"] in user_ids for row in tables["notifications"])


def generate_profile(profile: str, output: Path, size: int = 15000, seed: int = DEFAULT_SEED) -> dict[str, Any]:
    counts = profile_counts(profile, size)
    rng = random.Random(seed)
    output.mkdir(parents=True, exist_ok=True)
    types, packages = reference_data()
    users = generate_users(counts["users"], rng)
    applications = generate_applications(counts["policy_applications"], users, packages, rng)
    payments = generate_payments(counts["payments"], applications, rng)
    claims = generate_claims(counts["claims"], applications, rng)
    feedbacks = generate_feedbacks(counts["feedbacks"], users, rng)
    notifications = generate_notifications(counts["notifications"], users, rng)
    logs = generate_logs(counts["auto_check_logs"], rng)
    salary = generate_salary(counts["salary_training"], rng)
    tables = {
        "insurance_types": types,
        "insurance_packages": packages,
        "users": users,
        "policy_applications": applications,
        "payments": payments,
        "claims": claims,
        "feedbacks": feedbacks,
        "notifications": notifications,
        "auto_check_logs": logs,
    }
    validate_relationships(tables)

    ordered_tables = [
        ("insurance_types", types),
        ("insurance_packages", packages),
        ("users", users),
        ("policy_applications", applications),
        ("payments", payments),
        ("claims", claims),
        ("feedbacks", feedbacks),
        ("notifications", notifications),
        ("auto_check_logs", logs),
    ]
    for table, rows in ordered_tables:
        write_csv(output / f"{table}.csv", rows, TABLE_COLUMNS[table])
    write_csv(output / "salary_training.csv", salary)
    revenue_monthly = aggregate_revenue(payments)
    write_csv(output / "revenue_monthly.csv", revenue_monthly)
    if profile == "revenue":
        write_csv(output / "payments_ml_15000.csv", payments, TABLE_COLUMNS["payments"])
    write_sql(output / "synthetic_seed.sql", ordered_tables)

    db_business_total = sum(len(tables[name]) for name in SCALABLE_TABLES)
    manifest = {
        "synthetic": True,
        "contains_real_personal_data": False,
        "profile": profile,
        "requested_size": size,
        "random_seed": seed,
        "history_start": shift_month(END_MONTH, -(HISTORY_MONTHS - 1)).strftime("%Y-%m"),
        "history_end": END_MONTH.strftime("%Y-%m"),
        "counts": {name: len(rows) for name, rows in tables.items()} | {"salary_training": len(salary), "revenue_monthly": len(revenue_monthly)},
        "business_database_total": db_business_total,
        "notes": [
            "All identities and transactions are fictional.",
            "Synthetic user passwords are intentionally non-login placeholders.",
            "Import synthetic_seed.sql only into a fresh development database.",
            "Revenue aggregation keeps VERIFIED PREMIUM/RENEWAL payments and excludes CLAIM_PAYOUT records.",
        ],
    }
    (output / "dataset_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate deterministic synthetic datasets for the insurance project")
    parser.add_argument("--profile", choices=["balanced", "revenue", "full"], required=True)
    parser.add_argument("--size", type=int, default=15000, help="Total, payment, or per-table count depending on profile")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = generate_profile(args.profile, args.output, args.size, args.seed)
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
