# Digital Insurance Portal with Python Analytics

A bilingual English/Myanmar insurance management project with customer, agent, and admin workflows. Every generated PDF now includes readable English and Myanmar labels, including applications, claims, policy certificates, monthly analytics, archived period reports, and salary forecasts.

## Main features

- React 18 + Vite frontend with English/Myanmar language switching
- Spring Boot 3 backend with JWT security, insurance applications, claims, payments, schedules, reports, forms, and notifications
- MySQL persistence with an H2 development fallback
- Python analytics API with decimal-safe payroll calculations and a complete scikit-learn revenue-prediction pipeline
- Two transparent prediction modes:
  - linear regression when at least three historical net salaries are provided
  - growth scenario when historical data is not available
- Admin Dashboard monthly-revenue chart trained from verified premium-payment data
- Data preprocessing: validation, duplicate aggregation, chronological sorting, missing-month completion, outlier reporting, and time/seasonal/lag features
- Chronological train/test evaluation and feature-set selection with MAE, RMSE, R-squared, MAPE, holdout results, and a previous-month baseline comparison
- Six-month revenue forecast from a Python scikit-learn time-series regression model with approximate prediction ranges
- English/Myanmar PDFs for applications, claims, policy contracts/certificates, monthly and period analytics, and salary reports
- Rabbit Converter Unicode-to-Zawgyi conversion with embedded Zawgyi-One in every Spring Boot/Python PDF generator
- Frontend typography remains exactly as in the original project; Rabbit conversion and Zawgyi-One are PDF-only
- Input validation, CORS allow-listing, request-size limit, and automated Python tests
- Three included deterministic synthetic-data packs: 15,000 balanced records, 15,000 payment/ML rows, and 15,000 rows per scalable business table

## Architecture and ports

| Component | Port | Purpose |
| --- | ---: | --- |
| React/Vite | 5000 | Web interface |
| Spring Boot | 8081 | Main insurance API under `/api` |
| Python | 8001 | Salary and revenue-prediction APIs |
| MySQL | 3308 | Production/local database |

Vite proxies `/api` to Spring Boot and `/salary-api` to the Python service, so the browser uses same-origin URLs during development.

## Prerequisites

- Node.js 18 or newer
- Java 17
- Maven 3.9 or newer
- Python 3.10 or newer
- MySQL 8 (the backend start script can use or initialize a local instance when MySQL tools are installed)

## Setup

1. Configure the backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set a strong `JWT_SECRET`, database credentials, and admin credentials. Keep `.env` private.

2. Configure the frontend:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

3. Install dependencies:

   ```bash
   cd frontend && npm install
   cd ../salary_service && python3 -m pip install -r requirements.txt
   ```

## Run the project

Use three terminals from the project root:

```bash
# Terminal 1 - Spring and MySQL
./backend/start-backend.sh

# Terminal 2 - Python analytics service
./salary_service/run.sh

# Terminal 3 - React
cd frontend && npm run dev
```

Open `http://localhost:5000`. Sign in as an admin and choose **Salary & Forecast** in the sidebar.

## Bilingual PDF reports

PDF download buttons automatically create bilingual English/Myanmar documents. This applies to:

- application forms for customers, agents, and administrators
- claim forms for customers, agents, and administrators
- policy contracts and policy certificates
- current-month analytics reports
- reset-period exports and archived monthly reports
- salary calculation and forecast reports

The Myanmar PDF font is packaged with the application, so reports do not depend on fonts installed on the server or the reader's computer.

All PDF paths use `PdfFontUtil` (Spring Boot) or `pdf_report.py` (Python). Unicode source text is preserved in the database/API, converted at PDF render time using the Rabbit Converter 1.1.3 `uni2zg` rule set, and rendered with the bundled user-supplied `Zawgyi-One.ttf`.

### PDF download and IDM

Generated reports are fetched through the authenticated API as Base64 data in a
JSON response. The frontend decodes the data, validates the `%PDF-` signature,
and saves a local PDF Blob. Because the protected HTTP response is JSON instead
of `application/pdf`, download-manager extensions such as IDM cannot intercept
and repeat the API URL without the user's JWT.

If an older build saved a broken PDF, delete that file, rebuild/restart both the
frontend and backend, sign in again, and download a fresh copy. The same
transport is used for application, claim, policy, monthly/archive/reset, and
salary reports.

## Admin monthly revenue prediction

The dashboard reads up to 24 months of actual project data from verified premium payments. Claim-payout records are excluded because they are expenses. The React dashboard sends the chronological monthly values and source name to Python. Python preprocesses the series, keeps the newest months as a chronological test set, evaluates the model against a previous-month baseline, retrains on all processed records, and returns the next six months of predicted revenue.

The dashboard shows both the prediction result and how it was produced: raw/processed record counts, missing months, duplicates, outliers, selected features, train/test sizes, MAE, RMSE, R-squared, MAPE, baseline MAE, and whether the model beat the baseline.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/admin/dashboard/revenue-history?months=24` | Zero-filled verified monthly premium revenue |
| POST | `/salary-api/api/prediction/revenue` | Preprocessing report, chronological evaluation, model details, and future monthly revenue |

The model output is an estimate for planning, not a guarantee of future income.

## Included 15,000-record datasets

The `datasets/generated` directory contains all three requested synthetic-data options:

- `balanced_15000`: exactly 15,000 business database records across the complete workflow;
- `revenue_15000`: exactly 15,000 payment/revenue records plus required users and applications; and
- `full_15000_each`: 15,000 users, applications, payments, claims, feedback records, notifications, auto-check logs, and salary records.

Each profile includes CSV files, a MySQL seed, a 60-month model input, an exact-count manifest, and a saved Python model evaluation. See `DATASETS_15000_GUIDE.md` for safe development import, regeneration, validation, and training commands. All records are fictional and must not be used as real insurance/customer data.

## Salary formulas

```text
overtime pay     = overtime hours × overtime hourly rate
gross salary     = base salary + allowances + overtime pay + bonus
tax              = gross salary × tax rate / 100
pension          = base salary × pension rate / 100
total deductions = tax + pension + other deductions
net salary       = max(0, gross salary - total deductions)
```

Money is calculated with Python `Decimal` and rounded to two decimal places.

The forecast is an estimate, not an approved payroll decision. The PDF and web interface clearly label this limitation.

## Python analytics API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/health` | Service health |
| POST | `/api/salary/analyze` | Calculation plus forecast JSON |
| POST | `/api/salary/report` | English/Myanmar PDF report |
| POST | `/api/prediction/revenue` | Monthly revenue preprocessing, evaluation, and scikit-learn forecast |

Example request:

```json
{
  "employee_name": "Aye Aye",
  "employee_id": "EMP-001",
  "job_title": "Claims Officer",
  "currency": "MMK",
  "base_salary": 500000,
  "allowances": 50000,
  "overtime_hours": 10,
  "overtime_rate": 5000,
  "bonus": 25000,
  "deductions": 10000,
  "tax_rate": 5,
  "pension_rate": 2,
  "annual_growth_rate": 6,
  "performance_score": 4,
  "months_to_predict": 12,
  "historical_net_salaries": [480000, 490000, 505000]
}
```

## Tests and builds

```bash
cd salary_service
PYTHONPATH=. python3 -m unittest discover -s tests -v

cd ../frontend
npm run build

cd ../backend
mvn test
```

## Security notes

- Do not commit `.env`, database files, uploaded customer documents, or build output.
- Salary requests are processed in memory and are not persisted by the Python service.
- Put all services behind HTTPS and authenticated reverse-proxy rules in production.
- Change the development admin password before deployment.

## License notice

The browser UI keeps the original project typography and does not load Zawgyi-One or run Rabbit conversion. Only PDF generators use the supplied `Zawgyi-One.ttf`; the salary report additionally embeds DejaVu Sans for English text. Rabbit conversion rules are stored in `backend/src/main/resources/rabbit/uni2zg.json` and `salary_service/app/uni2zg.json` so Java and Python produce the same Zawgyi ordering.


## Python ML Prediction Center

The Admin portal includes aggregate forecasts for premium revenue, applications, claims, and payments. Setup, model behavior, APIs, and Windows run steps are documented in `PREDICTION_CENTER_GUIDE.md`.
