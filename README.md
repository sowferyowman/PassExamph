# ACET Exam MVP

React/Vite client, Express API, and PostgreSQL backend.

## Start here

- [Installation](docs/INSTALLATION.md)
- [Environment configuration](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [PostgreSQL schema and seed](supabase/schema.sql), [seed](supabase/seed.sql)

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run install:all
npm run dev
```

Local and deployed clients require `DATABASE_URL`; no active application route uses SQLite. Cross-device sync requires every client to use the same deployed API/database.
