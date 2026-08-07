# Installation and demo packaging

## Local setup

Requires Node.js 22+ and npm.

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run install:all
npm run dev
```

Set all `DEFAULT_ADMIN_*` values and `JWT_SECRET` in `server/.env`.

## Client demo ZIP

`server/data/acet.sqlite` is the live database snapshot. It includes current server-side users, content, and records. A recipient gets an independent copy, not live synchronization.

Create the ZIP from a separate copy, not the live worktree. Stop the API cleanly, include `acet.sqlite`, and exclude `acet.before-exam-history-reset.sqlite` (old backup), `server/.env`, `node_modules/`, and `client/dist/`.

If zipping while SQLite is running, include `acet.sqlite`, `acet.sqlite-wal`, and `acet.sqlite-shm` together; WAL may contain recent writes. After a clean shutdown, WAL/SHM can normally be omitted.
