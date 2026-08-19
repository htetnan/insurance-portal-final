# Insurance Synthetic Datasets: 15,000 Options 1, 2, and 3

The project includes all three requested dataset options. Every identity, application, payment, claim, and salary record is fictional. Email addresses use the reserved `.invalid` domain, and generated user passwords are intentionally non-login placeholders.

## Included datasets

| Folder | Purpose | Exact included counts |
| --- | --- | --- |
| `datasets/generated/balanced_15000` | Option 1: balanced project dataset | 15,000 database business records across users, applications, payments, claims, feedback, notifications, and auto-check logs; plus 500 salary rows. |
| `datasets/generated/revenue_15000` | Option 2: payment/revenue ML dataset | Exactly 15,000 payments plus 3,000 supporting users and 5,000 applications. |
| `datasets/generated/full_15000_each` | Option 3: full per-table dataset | 15,000 rows in each of seven scalable business tables plus 15,000 salary rows: 120,000 records total, of which 105,000 are database business records. |

Reference tables contain six insurance types and 24 packages. They do not receive 15,000 duplicate configuration rows because that would violate their purpose and, for some tables, uniqueness rules.

## Files in every dataset folder

- `dataset_manifest.json`: authoritative counts, date range, seed, and synthetic-data declaration.
- `synthetic_seed.sql`: MySQL inserts with preserved foreign-key relationships. It does not delete or truncate existing data.
- `users.csv`, `policy_applications.csv`, `payments.csv`, `claims.csv`, `feedbacks.csv`, `notifications.csv`, and `auto_check_logs.csv` when that profile uses the table.
- `insurance_types.csv` and `insurance_packages.csv`: reference data.
- `salary_training.csv`: salary-model data when included by the profile.
- `revenue_monthly.csv`: 60 model-ready monthly values from September 2021 through August 2026.
- `model_evaluation.json`: preprocessing, selected model/features, chronological holdout metrics, baseline comparison, and six future predictions.

The revenue profile also contains `payments_ml_15000.csv`, an explicit copy of its exact 15,000 payment records for notebooks or other ML tools.

## Data relationships

The generator validates these rules before it writes a dataset:

- every application references an existing synthetic customer, agent, and package;
- every payment references an existing application and that application's customer;
- every claim references an existing application and that application's customer/agent;
- every feedback references a customer;
- every notification references a user; and
- payment statuses, application statuses, claim statuses, and notification types match the Java enums/database schema.

Verified `PREMIUM` and `RENEWAL` payments are included in revenue. Pending/rejected records and `CLAIM_PAYOUT` expenses are counted but excluded from revenue, matching the Spring Dashboard endpoint.

## Safe MySQL import on Windows

Use synthetic data only in a separate development database. Do not import it into a real or production database. Back up any database you need to keep.

For a new empty development database, first create the project schema using the normal project setup. Then import one profile:

```bat
mysql -u root -p insurance_portal < datasets\generated\balanced_15000\synthetic_seed.sql
```

Or use the revenue dataset:

```bat
mysql -u root -p insurance_portal < datasets\generated\revenue_15000\synthetic_seed.sql
```

Or use the full per-table dataset:

```bat
mysql -u root -p insurance_portal < datasets\generated\full_15000_each\synthetic_seed.sql
```

Import only one profile into a fresh development database because the profiles intentionally use the same deterministic IDs.

After importing, start Spring Boot. The normal environment-configured administrator account remains the login account; generated users are analytical test records and cannot log in.

## Evaluate the included revenue data

Install Python dependencies:

```bat
cd salary_service
py -m pip install -r requirements.txt
cd ..
```

Evaluate a dataset again:

```bat
py -m data_generator.evaluate_revenue_dataset datasets\generated\revenue_15000\revenue_monthly.csv datasets\generated\revenue_15000\model_evaluation.json
```

The saved result includes MAE, RMSE, R-squared, MAPE, baseline MAE, model comparison, selected features, holdout predictions, and future predictions.

## Regenerate any option

The generator is deterministic with random seed `20260812`.

Option 1—15,000 total:

```bat
py -m data_generator.generate_insurance_data --profile balanced --size 15000 --output datasets\generated\balanced_15000
```

Option 2—15,000 payments:

```bat
py -m data_generator.generate_insurance_data --profile revenue --size 15000 --output datasets\generated\revenue_15000
```

Option 3—15,000 per supported table:

```bat
py -m data_generator.generate_insurance_data --profile full --size 15000 --output datasets\generated\full_15000_each
```

Change `--seed` to create a different reproducible synthetic dataset. Change `--size` for smaller development or unit-test datasets.

## Tests

```bat
set PYTHONPATH=.;salary_service
py -m unittest discover -s data_generator\tests -v
py -m unittest discover -s salary_service\tests -v
```

The tests check exact counts, foreign-key relationships, the synthetic-data declaration, model input length, predictions, and evaluation output.
