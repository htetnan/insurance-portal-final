# Glass Theme + 15,000 Row Performance Update

## What changed
- New professional DICP shield/check logo: `frontend/public/dicp-logo.svg`.
- Glassmorphism UI refresh for light/dark modes, cards, navbar, forms, tables, buttons, and auth screens.
- Server-side pagination (20 rows/request) for Admin Applications, Claims, Payments, and Users.
- User search now executes on MySQL rather than filtering all users in the browser.
- Added database index script: `database/performance_15000.sql`.
- Added HikariCP/JPA local performance settings.

## After importing a large dataset
In phpMyAdmin, select `insurance_portal` and run `database/performance_15000.sql` once.

## Run
Backend:
`cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=local`

Frontend:
`cd frontend && npm install && npm run dev`
