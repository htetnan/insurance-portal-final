# Insurance Prediction Center - Python ML Integration

This version integrates Python/scikit-learn predictions into the existing React + Spring Boot + MySQL insurance portal.

## What is predicted

The Admin **Prediction Center** forecasts aggregate operational activity only:

1. Verified premium revenue (MMK)
2. New policy application volume
3. Claim submission volume
4. Payment submission volume

These are management/planning forecasts. The model does **not** automatically approve/reject a person, decide a claim, or set an individual customer's insurance price.

## Architecture

```text
MySQL (15,000+ rows)
   |
   | monthly SQL aggregation
   v
Spring Boot :8081
   |  /api/admin/prediction/history
   |  /api/admin/dashboard/revenue-history
   v
React :5000  ----POST---->  Python Analytics :8001
                              /api/prediction/revenue
                              /api/prediction/operations
```

Only 12-36 monthly aggregate records are sent to the Python model, rather than sending thousands of database rows. This keeps prediction loading fast as the database grows.

## Python model workflow

For every forecast the service:

- validates month/value data;
- combines duplicate months;
- sorts chronologically;
- fills missing months with zero;
- reports IQR outliers without deleting real data;
- builds trend, seasonal, previous-month and rolling-average features when enough history exists;
- keeps the newest 25% (maximum 6 months) as a chronological holdout set;
- trains multiple scikit-learn `LinearRegression` candidates;
- selects the model with the lowest holdout MAE;
- compares it to a previous-month baseline;
- reports MAE, RMSE, R-squared and MAPE;
- retrains the selected candidate on all history;
- predicts 1-12 future months with approximate uncertainty bounds.

## Run on Windows / XAMPP

### 1. MySQL

Start **Apache** and **MySQL** in XAMPP. Import your project database in phpMyAdmin. Also run:

```text
database/performance_15000.sql
```

### 2. Python analytics

Open Command Prompt:

```bat
cd insurance-main\salary_service
run.bat
```

Or manually:

```bat
py -m pip install -r requirements.txt
py -m app.server
```

Python runs on:

```text
http://localhost:8001
```

Health check:

```text
http://localhost:8001/api/prediction/health
```

### 3. Spring Boot

Open another Command Prompt:

```bat
cd insurance-main\backend
mvn spring-boot:run
```

Spring Boot runs on port `8081`.

### 4. React

Open another Command Prompt:

```bat
cd insurance-main\frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5000
```

Sign in as Admin and select **Prediction Center** from the left menu.

## Prediction APIs

### Revenue

```text
POST /api/prediction/revenue
```

Input:

```json
{
  "months_to_predict": 6,
  "currency": "MMK",
  "points": [
    {"month": "2026-01", "revenue": 1200000},
    {"month": "2026-02", "revenue": 1350000},
    {"month": "2026-03", "revenue": 1420000}
  ]
}
```

### Applications / claims / payments

```text
POST /api/prediction/operations
```

Input:

```json
{
  "metric": "claims",
  "months_to_predict": 6,
  "points": [
    {"month": "2026-01", "value": 58},
    {"month": "2026-02", "value": 61},
    {"month": "2026-03", "value": 64}
  ]
}
```

Allowed metric values are `applications`, `claims`, and `payments`.

## Tests

From project root:

```bat
set PYTHONPATH=salary_service
py -m unittest discover -s salary_service\tests -v
```

This project currently includes tests for salary calculation, PDF transport/conversion, revenue prediction, and the new operational prediction model.

## Added: Feedback Analysis

Open **Admin → Prediction Center → Feedback Analysis**.

The website loads up to 1,000 recent feedback records from MySQL and sends only rating, category, message and feedback ID to the local Python service. The analysis shows:

- Positive / neutral / negative distribution
- Negative percentage by category
- Recurring message themes
- Rating ↔ text consistency evaluation
- Total analyzed records

The consistency percentage is not presented as formal classifier accuracy because star ratings are only a proxy label.

## Added: Application Readiness Analysis

Open **Admin → Prediction Center → Application Readiness** and choose an application.

The backend deliberately excludes customer identity data from the Python payload. Python checks only operational/policy facts:

- Coverage inside configured package minimum / maximum
- Requested duration inside configured policy term
- Required document count vs uploaded document count
- Required dynamic-form completeness
- Existing LOW / MEDIUM / HIGH system risk flag

Results are `READY_FOR_HUMAN_REVIEW`, `NEEDS_INFORMATION`, or `MANUAL_POLICY_REVIEW`.

**Important:** this module does not automatically approve or reject insurance, does not calculate approval probability, and does not replace an authorized underwriter/admin. It is a transparent pre-review checklist for human decision support.

## Unified Prediction Center tabs

1. Premium Revenue Prediction
2. Application Volume Prediction
3. Claim Volume Prediction
4. Payment Volume Prediction
5. Salary Forecast
6. Feedback Analysis
7. Application Readiness Analysis
