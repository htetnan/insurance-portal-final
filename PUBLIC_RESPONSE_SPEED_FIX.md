# Public Page Response Speed Fix

## What was slow
- AI chat loaded insurance types + active plans from MySQL on every message.
- AI requests could wait up to 30 seconds for the external provider.
- A new Java HttpClient was created for every AI request.
- Public plan/type endpoints queried MySQL on every visit.
- The browser had no fast cached copy of plan/type data.

## What changed
- Common insurance questions use an instant local answer path (plan, premium, claim, payment, application, documents, etc.).
- AI catalog data is cached in memory for 60 seconds.
- One reusable HttpClient is used with 3-second connect timeout and 8-second request timeout.
- AI response length/context were reduced for faster generation.
- Public plans and insurance types are cached in the backend for 60 seconds and send Cache-Control headers.
- Public Plans and Home pages use sessionStorage stale-while-revalidate caching: cached cards display immediately, then refresh quietly.
- Frontend chat request has a 10-second timeout and falls back cleanly.

## Run
Restart backend after replacing the project:

    cd backend
    mvn clean spring-boot:run

Then restart frontend:

    cd frontend
    npm install
    npm run dev
