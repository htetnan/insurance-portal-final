# Public Home bilingual + Admin Feedback performance fix

## Public Home
- Full English / Myanmar support for the redesigned home page.
- Navbar language switch now updates hero, cards, process steps, CTA, footer, and AI assistant UI.
- Dynamic known insurance type names are translated.
- Footer copyright/privacy/terms labels are bilingual.

## /admin/feedback performance
- Server-side pagination: default 25 rows/page.
- Server-side ALL / UNREAD / READ filtering.
- Customer fetched with EntityGraph to avoid N+1 queries.
- Mark All Read uses one bulk UPDATE query.
- Added feedback indexes to database/performance_15000.sql.

## API
GET /admin/feedback?page=0&size=25&status=ALL

## Database
Run the feedback index statements in database/performance_15000.sql in phpMyAdmin after backup.
If an index already exists, skip that duplicate CREATE INDEX statement.

## Run
Backend:
  cd backend
  mvn clean spring-boot:run

Frontend:
  cd frontend
  npm install
  npm run dev
