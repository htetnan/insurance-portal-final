---
name: Premium installment schedule system
description: How recurring premium payments (monthly/annual) are tracked and displayed
---

# Premium Installment Schedule System

## Architecture
- Schedule is **generated dynamically** from `PolicyApplication` + `InsurancePackage.paymentIntervalMonths` — no separate DB table.
- `Payment.periodNumber` (Integer, nullable) links a payment record to a specific installment slot.
- Legacy payments without `periodNumber` are treated as period 1.

## Key formula
- `totalInstallments = (duration_years * 12) / paymentIntervalMonths`
- `installmentAmount = premiumAmount / totalInstallments`
- `dueDate[n] = application.createdAt + (n-1) * intervalMonths`

## Installment statuses
- **PAID** — payment with status VERIFIED exists for that period
- **PENDING_VERIFICATION** — payment with status PENDING exists
- **DUE** — dueDate is in the current calendar month, no payment
- **OVERDUE** — dueDate is before today, no payment (or REJECTED)
- **UPCOMING** — dueDate is in the future

## Utility class
`PremiumScheduleUtil` in `backend/.../util/` — shared by both customer and admin endpoints.
- `buildSchedule(app, payments)` → `PremiumScheduleResponse` (full schedule for one policy)
- `buildAdminEntry(app, payments)` → `AdminScheduleEntryResponse` (most-urgent period entry)

## Endpoints
- `GET /customer/payment-schedule` — all approved policies for current customer
- `GET /admin/premium-schedule?status=ALL|OVERDUE|DUE|PENDING_VERIFICATION|PAID`
- `POST /customer/payments` — now accepts optional `periodNumber` and `periodLabel`; checks duplicate by period rather than globally for recurring plans.

## Why: no separate schedule table
Avoids migration complexity; schedule is always derivable from existing data. Only the `payments.period_number` column was added to track which installment has been paid.

## One-time (non-recurring) policies
If `paymentIntervalMonths` is null/0, `totalInstallments = 1` and `installmentAmount = premiumAmount` — backward compatible.
