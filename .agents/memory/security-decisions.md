---
name: Security decisions for the insurance portal
description: Durable auth/security patterns decided during build — JWT, CORS, admin bootstrap, IDOR, file upload
---

# Security Decisions

## JWT Secret
- Required via `app.jwt.secret=${JWT_SECRET}` in `application.properties` — no fallback → fails fast in production if unset
- Dev fallback lives in `application-dev.properties` only
- **Why:** Committing fallback secrets to production config leaves a known signing key in source

## CORS
- Configured via `app.cors.allowed-origins` property (set via `CORS_ALLOWED_ORIGINS` env var in production)
- Spring Security 6 pattern: `cors(Customizer.withDefaults())` + `CorsConfigurationSource` bean inside `SecurityConfig`
- Never use wildcard origin (`*`) when `allowCredentials=true` — browsers reject it
- **Why:** Explicit origin list + credentials is the only secure and compliant combination

## Admin bootstrap
- Admin credentials injected via `app.admin.email=${ADMIN_EMAIL}` and `app.admin.password=${ADMIN_PASSWORD}` Spring properties
- No fallback in `application.properties` → production fails fast if env vars unset
- Dev fallbacks in `application-dev.properties` only; startup log never prints credential values
- **Why:** Known fallback credentials in production are an easy takeover vector

## Object-level authorization (IDOR prevention)
- Every ID-based mutation verifies the resource belongs to the authenticated principal before acting
- Returns HTTP 403 on mismatch — must be applied to all new ID-accepting endpoints
- **Why:** Skipping ownership check = Broken Object Level Authorization (BOLA/IDOR) — top OWASP API risk

## Transactions / lazy loading
- `spring.jpa.open-in-view=false` — all controller methods annotated `@Transactional` or `@Transactional(readOnly=true)`
- **Why:** Without explicit transactions, lazy relation access at DTO-mapping time throws `LazyInitializationException`

## File upload (path traversal prevention)
- Client-supplied filename (`getOriginalFilename()`) is discarded; server generates UUID filename
- Extension derived from content-type allowlist (JPEG/PNG/WEBP/GIF only)
- Resolved path verified to stay within upload root via `canonical path prefix check`
- **Why:** `getOriginalFilename()` can contain `../` sequences enabling write-outside-root attacks

## Auth/me endpoint
- `/auth/login` and `/auth/register` are `permitAll`; `/auth/me` is explicitly marked `authenticated()`
- **Why:** Blanket `permitAll` on `/auth/**` would bypass JWT validation on `/auth/me`, causing confusing server errors instead of clean 401s

## Role-scoped profile editing
- Self-service `PUT /auth/profile` enforces per-role field rules in the controller (not just the frontend): ADMIN can edit any of its own fields; CUSTOMER can only change non-identity fields (e.g. address) — name/phone/email are ignored even if sent; AGENT gets a 403 and must go through admin (`PUT /admin/users/{id}`)
- **Why:** A user profile endpoint that trusts client-supplied fields lets any role escalate or bypass business rules (e.g. a customer renaming themselves, or an agent self-approving profile changes meant to be admin-controlled) — restrictions must be enforced server-side per role, not just hidden in the UI
