# Dashboard English / Myanmar Language Support

The redesigned dashboard now uses the existing i18next language system throughout the shared workspace shell and the Admin, Agent, and Customer dashboards.

## Included
- Visible EN / မြန်မာ switch inside the dashboard top bar
- Persistent language choice through the existing i18next localStorage detector
- Translated workspace heading, role labels, security/session text, profile shortcut, navigation titles
- Customer greeting, date, role badge, status labels, table dates, and illustration labels follow the selected language
- Agent table statuses/dates follow the selected language
- Admin dates follow the selected language; existing dashboard labels remain translated through admin.dashboard keys
- HTML document language is synchronized to `en` or `my` after language changes

## Run
Frontend:
```
cd frontend
npm install
npm run dev
```
Backend:
```
cd backend
mvn spring-boot:run
```
