# DICP AI Assistant — 50,000 Q&A Knowledge Upgrade

## What was added

The chatbot now includes a local retrieval-augmented knowledge base with exactly **50,000 unique question/answer examples**:

- 25,000 insurance Q&A
- 15,000 website/workflow Q&A
- 10,000 insurance-business/operations Q&A
- English + Myanmar/mixed-language questions

This is a **RAG knowledge-base upgrade**, not a false claim of neural-network fine-tuning. RAG is appropriate here because company website facts and workflows can be updated without retraining a model.

## Important files

- `backend/src/main/resources/ai/insurance_website_qa_50000.tsv` — production knowledge base loaded by Spring Boot.
- `backend/src/main/resources/ai/knowledge_metadata.json` — record counts and schema.
- `backend/src/main/java/com/insurance/portal/service/AiKnowledgeService.java` — loads the 50k records and builds an in-memory inverted index.
- `backend/src/main/java/com/insurance/portal/controller/AiChatController.java` — retrieves top matches and supplies them to the external AI; falls back to local knowledge when the external AI is unavailable.
- `tools/generate_ai_qa_50000.py` — deterministic generator used to create the dataset.

## Dataset fields

`id, domain, category, intent, language, question, answer, keywords, source_type, route`

## Runtime behavior

1. User sends a message to `POST /ai/chat`.
2. Navigation-only requests can still use fast deterministic website guidance.
3. All other questions search the local 50,000-record knowledge base.
4. The best retrieved answers are appended to the system context.
5. If `XAI_API_KEY` is configured, the AI synthesizes a natural answer using the retrieved knowledge plus live DICP package data.
6. If the external AI is unavailable, a sufficiently strong local match is returned directly.
7. Existing chat history continues to provide conversational memory.

## Knowledge status endpoint

`GET /ai/knowledge/stats`

Expected record count after startup: `50000`.

## Recommended environment

```env
XAI_API_KEY=your_real_api_key
AI_MODEL=grok-3-mini
AI_MAX_TOKENS=1600
```

The local 50k knowledge base works without the key, but the key produces more natural synthesis and better multi-part follow-up answers.

## Updating the knowledge later

Edit the generator topic definitions or replace the TSV with reviewed company Q&A. Preserve the same 10-column TSV schema. Restart Spring Boot to reload and re-index the knowledge base.

For production quality, replace synthetic variants over time with real anonymized customer questions, reviewed policy wording, approved SOPs, and official product documentation. Do not train on passwords, OTPs, full card numbers, or unnecessary personal data.
