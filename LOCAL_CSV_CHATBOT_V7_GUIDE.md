# Local CSV Chatbot V7 (No API)

This chatbot works without xAI/OpenAI or any paid external API.

## Answer order
1. Exact website actions already known by the portal.
2. `backend/src/main/resources/ai/curated_manual_qa.csv` (high-trust manual answers).
3. `backend/src/main/resources/ai/insurance_website_qa_50000.tsv` (secondary fallback).
4. Safe fallback when no relevant answer is found.

## Main file you edit
`backend/src/main/resources/ai/curated_manual_qa.csv`

Columns:
- `id` unique row ID
- `domain`: website / insurance / business / general
- `category`
- `intent`
- `language`: my / en
- `question`
- `answer`
- `keywords` (space-separated synonyms)
- `route` optional website route
- `priority` 1-100 (higher = preferred)

Example:
```csv
id,domain,category,intent,language,question,answer,keywords,route,priority
MY001,website,account,forgot_password,my,password မေ့သွားရင်ဘာလုပ်ရမလဲ,Login page မှာ Forgot Password ကိုသုံးပါ,password forgot reset,/login,100
```

After editing the CSV, restart Spring Boot so it reloads the file.

## Run
```bat
cd backend
mvn clean spring-boot:run
```

## Check status
`http://localhost:8081/api/ai/status`

Expected fields include:
- `mode: local-csv`
- `externalApiRequired: false`
- `knowledgeReady: true`
- `curatedRecords`: manual CSV record count
- `secondaryRecords`: secondary knowledge count

## Important limitation
A local CSV chatbot cannot truly reason about arbitrary unseen topics like a large language model. It can answer well when the question matches knowledge you supplied. Add high-quality questions, paraphrases, keywords, and answers to the curated CSV to expand coverage safely.
