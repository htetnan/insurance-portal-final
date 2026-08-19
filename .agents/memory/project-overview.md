---
name: Digital Insurance Portal — project overview
description: Tech stack, ports, and key conventions — non-sensitive architectural decisions only
---

# Digital Insurance Claim and Premiums Portal

## Stack
- Frontend: React 18 + Vite + Bootstrap 5 + react-i18next (EN/Myanmar bilingual)
- Backend: Spring Boot 3.2 + Spring Security JWT + Spring Data JPA
- Salary service: Python 3.10+ standard-library HTTP API + ReportLab bilingual PDF
- DB: MySQL 8+ (production) / H2 in-memory (dev profile)

## Ports
- Frontend (Vite): port 5000 (webview workflow; changed from 5173 to match Replit webview requirement)
- Backend (Spring Boot): port 8081, context path `/api`
- Salary service (Python): port 8001, paths `/api/salary/*`

## Key conventions
- Spring API calls proxied via Vite `/api` → `:8081`
- Salary calls proxied via Vite `/salary-api` → `:8001`
- JWT in localStorage; axios interceptor adds `Authorization: Bearer` header
- `@Transactional` required on all controller methods (OSIV disabled)
- Admin credentials sourced from env vars at startup — no hardcoded production fallback
- All mutation endpoints include IDOR ownership checks; see security-decisions.md
