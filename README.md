# ACET Exam MVP

React/Vite client, Express API, and SQLite handoff.

## Start here

- [Installation and demo packaging](docs/INSTALLATION.md)
- [Environment configuration](docs/ENVIRONMENT.md)
- [Features and data ownership](docs/FEATURES.md)
- [Deployment and security](docs/DEPLOYMENT.md)
- [Data audit and migration path](docs/MIGRATION.md)

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run install:all
npm run dev
```

The default database is `server/data/acet.sqlite`. Project copies are independent snapshots; cross-device sync requires every client to use the same deployed API/database.
