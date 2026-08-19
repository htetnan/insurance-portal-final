# AI Chatbot V3 — Burmese Retrieval + AI Diagnostics

This revision fixes short Burmese insurance questions such as `အသက်အာမခံကဘာလဲ`.

## What changed
- Burmese semantic aliases map common Myanmar insurance phrases to KB categories.
- Myanmar Unicode combining marks are preserved during tokenization.
- Common life/health/premium/coverage/deductible/beneficiary/exclusion questions have bilingual local answers.
- External AI failures are no longer silently swallowed; the backend logs the error.
- `GET /api/ai/status` reports whether the external AI key is configured and the last provider error.
- `backend/.env` is now automatically imported by Spring Boot when present.
- Local RAG acceptance threshold is reduced from 0.32 to 0.24 after synonym expansion.

## Important
50,000 Q&A records are a local knowledge base, not a guarantee that every possible sentence can be matched. For unrestricted questions, configure the external AI provider as well.

Create `backend/.env` (do not commit real secrets):

```properties
XAI_API_KEY=YOUR_KEY_HERE
AI_MODEL=grok-3-mini
AI_MAX_TOKENS=1600
```

Run:
```bat
cd backend
mvn clean spring-boot:run
```

Check:
- `http://localhost:8081/api/ai/knowledge/stats`
- `http://localhost:8081/api/ai/status`

Expected for the life-insurance test:
- POST `/api/ai/chat` with `message: အသက်အာမခံကဘာလဲ` returns a direct Burmese life-insurance explanation, even without an external AI key.
