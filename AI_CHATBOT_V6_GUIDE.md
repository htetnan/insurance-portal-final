# AI Chatbot V6 — Intent-Gated RAG

This version improves answer relevance rather than merely increasing Q&A count.

## Main changes
- Fixed `acc` Java word-boundary regex.
- Added explicit domain + intent classification before retrieval.
- Website intents such as register/login/claim/payment use verified portal workflows.
- RAG searches the detected domain and intent first.
- General questions do not receive unrelated insurance RAG context.
- Weak local matches are not returned directly.
- xAI system instructions reject off-topic retrieved records and answer in the user's language.
- Site owner/development facts are only answered from configured metadata.

## Recommended .env
```
XAI_API_KEY=YOUR_REAL_KEY
AI_MODEL=grok-3-mini
AI_MAX_TOKENS=1600
APP_OWNER=Your Company or Owner Name
APP_DEVELOPMENT_INFO=Verified website development information
```

## Test questions
- acc ဘယ်လိုဖွင့်ရမလဲ
- account ဘယ်လိုဖွင့်ရမလဲ
- claim ဘယ်လိုတင်ရမလဲ
- ကားအာမခံကဘာလဲ
- premium ဘယ်လိုတွက်လဲ
- Who owns this website?
- Website development time
- What is photosynthesis? (tests general xAI route without insurance RAG contamination)
