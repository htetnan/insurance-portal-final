# Powerful AI Chatbot Upgrade

## What was upgraded
- Detailed open-ended questions now reach the AI instead of being trapped by short fixed `claim` / `apply` / `how` replies.
- Conversation memory increased from 8 turns to 20 turns.
- Per-history-message context increased from 800 to 2,000 characters.
- User message size increased from 1,500 to 5,000 characters.
- AI answer budget increased to 1,600 tokens by default (configurable up to 3,000).
- AI request timeout increased to 25 seconds; frontend timeout is 30 seconds.
- Assistant prompt now supports detailed insurance explanations, comparisons, scenarios, underwriting concepts, policy wording, claims, documents, risk factors, and general-knowledge questions.
- DICP-specific facts remain grounded in the live insurance type/package catalog so the bot should not invent company plans.
- Browser chat history persists across refreshes (last 30 visible messages).
- Added clear-conversation button, multi-line input, Enter-to-send / Shift+Enter-new-line, and readable bold/multiline response rendering.

## AI configuration
The backend still uses the existing xAI-compatible setup in this project. Add your key to the backend environment:

```env
XAI_API_KEY=your_key_here
AI_MODEL=grok-3-mini
AI_MAX_TOKENS=1600
```

`AI_MAX_TOKENS` may be changed up to 3000 by the controller. Without `XAI_API_KEY`, the website assistant still provides local website navigation and common insurance fallback answers, but truly unrestricted detailed answers require the external AI service.

## Run on Windows
Backend:
```bat
cd backend
mvn spring-boot:run
```

Frontend:
```bat
cd frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5000`).

## Important behavior
The AI is intentionally not allowed to make a binding underwriting approval, final premium quote, eligibility decision, or final claim decision for an individual. It can explain the likely factors, documents, process, and next steps in detail.
