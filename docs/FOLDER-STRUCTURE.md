# Folder structure

```text
client/                 React/Vite application
  src/api/              Axios API wrappers
  src/services/         Cache, scoring, and persistence helpers
  src/pages/            Route-level UI
  src/features/         Exam and community UI
server/
  src/config/           SQLite path and schema creation
  src/middleware/       Auth middleware
  src/routes/           HTTP endpoints
  src/services/         Auth, AI, email/SMS, exam services
  data/                 Runtime SQLite files (ignored by Git)
docs/                   Handoff docs
```

`contentRoutes.js` owns shared catalogs/forum/notifications. `dataRoutes.js` owns per-user `app_data`. `storage.js` bridges browser storage and the server APIs.
