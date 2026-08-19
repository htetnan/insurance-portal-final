# Public Home — Human-first + AI Insurance Assistant

## What changed
- Replaced generic hero copy with the Myanmar brand message about protecting what people value most and moving forward with confidence.
- Added a human-first public homepage layout with real-life protection framing instead of software/dashboard marketing.
- Added an interactive “What matters most?” protection needs check that works before login.
- Expanded public insurance cards to six categories when available.
- Added plain-language insurance tips and human-support explanation.
- Upgraded the floating DICP Insurance Assistant with suggested questions, bilingual English/Myanmar UI, and a clear human-review boundary.
- AI backend context now supports insurance concepts, coverage, premiums, exclusions, applications, documents, payments, claims, renewals, and portal guidance.
- AI does not make final personal eligibility, underwriting, approval, pricing, or claim decisions.

## AI configuration
Set `XAI_API_KEY` in the backend environment to enable the external AI response path. Without a key, the project uses its built-in bilingual rule-based fallback for common insurance questions.

## Run
1. Start MySQL/XAMPP.
2. Backend: `mvn spring-boot:run`
3. Frontend: `npm install` then `npm run dev`
4. Open the public homepage.

## Build note
The supplied ZIP does not include frontend `node_modules`. Run `npm install` once before `npm run build` or `npm run dev`.
