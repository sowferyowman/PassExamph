# Deployment and security checklist

Deploy one persistent Express API and make every browser use it. The client uses `VITE_API_BASE_URL || "/api"` (`client/src/api/http.js:4`); SQLite uses `SQLITE_PATH` or `server/data/acet.sqlite` (`server/src/config/database.js:14`). SQLite is appropriate for one persistent API instance, not multiple writers/replicas.

## Before public deployment

- [ ] Set a unique production `JWT_SECRET`. Current code: `const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";` (`server/src/services/authService.js:8`).
- [ ] Set all `DEFAULT_ADMIN_*` values. Startup requires them (`authService.js:87-100`).
- [ ] Use a secret manager; never deploy `server/.env`.
- [ ] Set `NODE_ENV=production`, exact `CLIENT_ORIGIN`, HTTPS, and persistent storage.
- [ ] Back up SQLite safely, including WAL when copied during writes.
- [ ] Review `resolveStudent` in `server/src/middleware/auth.js:17-24`: it can use `DEV_STUDENT_ID` when no access cookie exists. Disable/remove this development fallback for sensitive production routes.
- [ ] Test login/refresh, admin-only writes, notifications, recovery, and large reviewer saves.

## AI without Groq

`GROQ_API_KEY` is optional. `/diagnose-exam` and `/adaptive-gate` return local fallbacks from `aiService.js` when Groq is unavailable. `/score-essay` returns pending review (`score: null`) rather than a 500 (`aiRoutes.js:30-37`; `aiService.js:412-447`).
