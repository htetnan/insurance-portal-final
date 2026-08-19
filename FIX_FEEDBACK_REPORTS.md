# Feedback Analysis + Reports Performance Fix

## What was fixed

### 1) Feedback Analysis: `Request body is empty or too large`
Cause: the local Python analytics server previously accepted only 128 KB request bodies while the UI sent up to 1,000 feedback records.

Changes:
- Prediction Center now requests the latest 300 feedback records.
- Each feedback message sent to Python is capped at 600 characters.
- Python request-body limit is now 1 MB by default and configurable with `ANALYTICS_MAX_BODY_BYTES`.
- Customer identity fields are still excluded from feedback analysis.

Optional environment override:

```bat
set ANALYTICS_MAX_BODY_BYTES=2097152
```

Then restart `salary_service`.

### 2) `/admin/reports` initial loading
Cause: the old page loaded full Application, Claim and Payment entities with `findAll()` and calculated many report values in Java. With 15,000+ rows this also pulled unnecessary TEXT/LONGTEXT columns.

Changes:
- Initial page now calls `/admin/reports/summary`.
- Summary values are calculated by MySQL using `COUNT`, `SUM`, `GROUP BY` and monthly aggregation.
- Heavy Claims/Agents/Packages details are lazy-loaded only when those tabs are opened.
- Wallet and Monthly Snapshot tabs retain their own lazy loading.
- Extra report indexes were added to `database/performance_15000.sql`.

## Required database step
Run the new report indexes in phpMyAdmin. If you already ran the older `performance_15000.sql`, run only the six `Report aggregation indexes` statements at the bottom of the updated file.

## Restart after replacing project
1. Restart Python analytics service.
2. Restart Spring Boot backend.
3. Restart frontend (`npm install` once if needed, then `npm run dev`).
