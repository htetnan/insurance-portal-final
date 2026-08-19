# AI Website Assistant Update

The public chatbot is now a conversational insurance + website assistant.

## What changed
- Removed the long scripted greeting/disclaimer.
- Myanmar messages are no longer automatically forced into canned replies.
- Open-ended insurance questions go to the configured AI model.
- The assistant receives the last 8 chat turns for follow-up conversation memory.
- The assistant knows the website route map for public, customer, agent and admin areas.
- Fast deterministic answers remain for common website tasks such as apply, claim, payment, profile and password help.
- DICP-specific plan facts come from the current insurance types and active package catalog.
- General insurance concepts can be explained normally by the AI.
- Human-review wording is only shown when a user directly asks for a binding approval/eligibility/underwriting/claim decision.

## Required for open-ended AI answers
Set `XAI_API_KEY` for the backend process. Without an API key, the chatbot still provides local website help and several common insurance explanations, but unrestricted open-ended insurance answers require the AI service.

## Run
Backend:
`mvn clean spring-boot:run`

Frontend:
`npm install`
`npm run dev`
