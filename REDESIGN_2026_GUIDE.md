# DICP Insurance 2026 UI Redesign

## What changed
- New public home page with a real-world insurance portal visual system.
- New shared admin / agent / customer workspace layout.
- Profile identity card in sidebar and compact profile shortcut in workspace header.
- Admin and customer profile screens restyled.
- Agent can now upload/replace their own profile photo. Agent profile fields remain admin-controlled.
- Existing insurance workflows, API routes, prediction center, reports and feedback logic remain in place.

## Profile image behavior
- ADMIN: can edit own profile fields and photo.
- CUSTOMER: can edit allowed profile fields and photo.
- AGENT: can edit only their own photo. Other profile fields remain controlled by ADMIN.
- Images continue to use the existing protected `/auth/profile/picture` endpoint and `uploads/profile-pictures` storage.

## Run
Backend:
`cd backend && mvn clean spring-boot:run`

Frontend:
`cd frontend && npm install && npm run dev`

Open `http://localhost:5000`.
