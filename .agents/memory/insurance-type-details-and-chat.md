---
name: Insurance type details + AI chat architecture
description: InsuranceType now has description/benefits/rules fields; AI chat uses XAI_API_KEY env var with rule-based fallback; payment requires last-6-digits + amount
---

## Insurance Type Fields (added)
- `InsuranceType` entity now has `description`, `benefits`, `rules` TEXT columns (Hibernate `ddl-auto=update` adds them automatically)
- `GET /admin/insurance-types` and `PUT /admin/insurance-types/{id}` return/accept these fields
- `GET /insurance-types/public` (no auth) serves them to the home page

## Home Page
- `HomePage.jsx` fetches from `/insurance-types/public` at mount — dynamic, not static
- Insurance type cards expand inline to show benefits + rules when admin has filled them in
- Icon/color mapped by type name: LIFE, HEALTH, VEHICLE, PROPERTY, FIRE, MARINE, TRAVEL, etc.

## AI Chat Widget
- Floating 🤖 bubble in bottom-right of home page (visitors + logged-in users)
- Backend: `POST /ai/chat` (public, no auth) in `AiChatController.java`
- Uses `XAI_API_KEY` env var → calls xAI Grok (`grok-3-mini`, `https://api.x.ai/v1/chat/completions`)
- Falls back to rule-based keyword matching when no API key is set
- **To activate real AI**: user must add xAI from Connectors pane in Replit Settings, then set `XAI_API_KEY` secret

## Payment Duplicate Prevention
- `Payment` entity: `transactionLastSixDigits` (VARCHAR 6) + `transactionAmount` (DECIMAL)
- `PaymentRepository`: `existsByTransactionLastSixDigitsAndStatusNot` — blocks reuse of same last-6 digits
- Frontend: two required fields added to payment modal before screenshot upload
- Validation: must be exactly 6 numeric digits; amount > 0; duplicate → 409 with Myanmar error message

**Why:** Prevent the same transaction screenshot from being submitted multiple times under different policies.
