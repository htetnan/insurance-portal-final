# Python Revenue Prediction: Code and Data Flow

This project predicts aggregate monthly premium revenue for planning. It does not predict whether an individual customer, policy, or claim should be approved.

## 1. Real project data

Spring Boot reads `Payment` records and keeps only records that:

- have `VERIFIED` status;
- contain a valid amount and creation date; and
- are not `CLAIM_PAYOUT` expenses.

The endpoint is:

```text
GET /api/admin/dashboard/revenue-history?months=24
```

Implementation: `backend/src/main/java/com/insurance/portal/controller/AdminController.java`.

For development and model demonstration, the project also contains synthetic payment datasets under `datasets/generated`. Their `revenue_monthly.csv` files use the same verified-premium and claim-payout exclusion rules. See `DATASETS_15000_GUIDE.md`.

The response contains chronological monthly points:

```json
{
  "currency": "MMK",
  "source": "verified_premium_payments",
  "points": [
    { "month": "2026-01", "revenue": 1200000 },
    { "month": "2026-02", "revenue": 1450000 },
    { "month": "2026-03", "revenue": 1530000 }
  ]
}
```

## 2. Data preprocessing

`salary_service/app/revenue_model.py` performs these steps:

1. Validate `YYYY-MM` dates and finite, non-negative revenue.
2. Sum duplicate records for the same month.
3. Sort records by month.
4. Insert missing months with revenue `0`.
5. Detect IQR outliers and report them without deleting or changing real payments.
6. Create candidate feature sets from time, seasonal month values, previous revenue, and a three-month rolling average.

The API returns the preprocessing counts so the dashboard can show what happened to the data.

## 3. Training and model selection

The newest 25% of records, up to six months, is reserved as a chronological holdout set. The project never randomly shuffles time-series records.

Several transparent scikit-learn `LinearRegression` candidates are evaluated:

- trend;
- trend plus seasonal features;
- trend plus lag/rolling features; and
- trend plus seasonal and lag features when enough records exist.

The candidate with the lowest holdout MAE is selected. This prevents the project from automatically choosing a complicated model that fits training data well but predicts unseen months poorly. The selected model is then retrained on every processed record before future months are predicted.

## 4. Evaluation result

The Python response includes:

| Metric | Meaning |
| --- | --- |
| MAE | Average absolute prediction error in MMK; lower is better. |
| RMSE | Error metric that gives more weight to large misses; lower is better. |
| R-squared | Holdout fit score. It may be negative when a model performs poorly. |
| MAPE | Average percentage error, calculated only for non-zero actual months. |
| Baseline MAE | Error from predicting that the next month equals the previous month. |
| Beats baseline | Whether the selected model's MAE is no worse than the baseline MAE. |

R-squared is `null` when the test set is too small or has no variation. The interface displays `N/A` instead of inventing a score.

## 5. Prediction API

```text
POST /api/prediction/revenue
```

Example request:

```json
{
  "currency": "MMK",
  "source": "verified_premium_payments",
  "months_to_predict": 6,
  "points": [
    { "month": "2026-01", "revenue": 1200000 },
    { "month": "2026-02", "revenue": 1450000 },
    { "month": "2026-03", "revenue": 1530000 }
  ]
}
```

Important response sections:

```json
{
  "model": {
    "selected_candidate": "trend",
    "selection_metric": "holdout_mae",
    "features": ["time_index"]
  },
  "preprocessing": {
    "raw_records": 3,
    "processed_records": 3,
    "missing_months_filled": 0
  },
  "evaluation": {
    "method": "chronological_one_step_holdout",
    "mae": 0,
    "rmse": 0,
    "beats_baseline": true
  },
  "predictions": [
    {
      "month": "2026-04",
      "predicted_revenue": 1610000,
      "lower_bound": 1510000,
      "upper_bound": 1710000
    }
  ]
}
```

The numbers above only demonstrate the JSON format. When the application runs, results come from the verified payments stored in the project's database.

## 6. Dashboard integration

`frontend/src/pages/admin/AdminDashboard.jsx`:

1. loads revenue history from Spring Boot;
2. sends it to the Python service;
3. plots actual and predicted revenue; and
4. displays preprocessing, selected features, train/test sizes, evaluation metrics, and baseline comparison.

English and Myanmar labels are stored in `frontend/src/locales/en.json` and `frontend/src/locales/my.json`. The frontend font is unchanged. Rabbit conversion and Zawgyi-One remain limited to PDF generation.

## 7. Run and test on Windows

```bat
cd salary_service
py -m pip install -r requirements.txt
py -m unittest discover -s tests -v
py -m app.server
```

In separate terminals:

```bat
cd backend
mvn clean spring-boot:run
```

```bat
cd frontend
npm install
npm run dev
```

Open `http://localhost:5000`, sign in as an administrator, and open the Dashboard. The prediction section updates from current verified-payment data whenever the dashboard loads.
