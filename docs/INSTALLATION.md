# Installation and demo packaging

## Local setup

Requires Node.js 22+ and npm.

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run install:all
npm run dev
```

Set `DATABASE_URL`, all `DEFAULT_ADMIN_*` values, and `JWT_SECRET` in `server/.env`. Apply `supabase/schema.sql` and then `supabase/seed.sql` to the PostgreSQL database before starting the API.

## Local database

The active backend uses PostgreSQL through `DATABASE_URL`. The legacy SQLite database files are not used by the migrated request paths and should not be packaged as production data.
