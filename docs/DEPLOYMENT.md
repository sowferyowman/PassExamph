# Deployment guide

## Current database

The application currently uses **SQLite** through Node's built-in `node:sqlite` module. The database defaults to `server/data/acet.sqlite`; production should set `SQLITE_PATH` to a persistent absolute path outside ephemeral build storage.

SQLite is appropriate for a small MVP deployed as one long-running API instance with a persistent disk. Do not run multiple API replicas against the same SQLite file on network storage. Back up the database file regularly, including its `-wal` file when write-ahead logging is active.

## Production layout

Use one of these layouts:

1. **Single domain (recommended):** serve `client/dist` and reverse-proxy `/api` to Express. Set `VITE_API_BASE_URL=/api` and `CLIENT_ORIGIN=https://example.com`.
2. **Separate domains:** serve the client at `https://app.example.com` and API at `https://api.example.com`. Build the client with `VITE_API_BASE_URL=https://api.example.com/api` and set `CLIENT_ORIGIN=https://app.example.com`.

Build and start:

```bash
npm ci
npm --prefix client ci
npm run client:build
NODE_ENV=production npm run server:start
```

Run the API with a process manager such as systemd, PM2, Docker, Render, Railway, or another platform that provides persistent disk storage. Store secrets in the platform's secret manager, not in repository files.

## Domain and SSL / HTTPS

1. Buy or use an existing domain and create DNS records for the chosen hostnames.
2. Point `A`/`AAAA` records to the server IP, or use the deployment platform's provided CNAME record.
3. Put Nginx, Caddy, Cloudflare, or the platform proxy in front of Express.
4. Serve `client/dist` as static files and proxy `/api` to `http://127.0.0.1:4000`.
5. Issue and renew a TLS certificate. Caddy and most platforms automate Let's Encrypt; with Nginx use Certbot.
6. Force HTTP-to-HTTPS redirects and set `NODE_ENV=production`. The app then marks auth cookies as `Secure`.
7. Set `CLIENT_ORIGIN` to the exact HTTPS client URL. Do not use `*` because the app uses credentialed cookies.

Example Nginx location blocks:

```nginx
location / {
  root /var/www/acet/client/dist;
  try_files $uri $uri/ /index.html;
}

location /api/ {
  proxy_pass http://127.0.0.1:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Migration path: SQLite to Supabase/Postgres

Supabase uses PostgreSQL, not SQLite. This project does not yet include a database abstraction layer, so migration requires replacing direct SQL calls rather than changing one connection string.

### Areas to change

- `server/src/config/database.js`: replace `node:sqlite`, schema bootstrap, and file-path setup with a Supabase client or a Postgres client/pool.
- `server/src/services/authService.js`: migrate `users`, `sessions`, password-reset, verification, and login-history queries.
- `server/src/routes/*.js` and `server/src/services/*.js`: migrate each `getDb().prepare(...).get/all/run` query to parameterized Postgres/Supabase calls.
- `server/src/routes/dataRoutes.js` and `server/src/routes/adminEssayRoutes.js`: migrate the `app_data` records that currently retain legacy dashboard/reviewer progress JSON.
- `server/src/services/dashboardService.js`: migrate dashboard, exam log, progress, subject, reward, and AI insight queries.

### Recommended migration steps

1. Design Postgres tables equivalent to the current SQLite schema. Use UUID/identity keys and add indexes for foreign keys and frequent filters.
2. Export the SQLite data during a maintenance window. Validate every record count and foreign-key relationship.
3. Import to a staging Supabase project and adapt the server queries one route at a time.
4. Keep the service-role key on the server only. Never expose it through `VITE_` variables or browser code.
5. Implement Row Level Security only if the browser will access Supabase directly; with this Express API, server-side authorization remains the primary gate.
6. Test authentication, sessions, admin access, exam saves, reviewer progress, and notifications before cutover.
7. Back up SQLite, deploy with a feature flag or maintenance window, then monitor errors and data writes after cutover.

Supabase Auth is optional. The current application already has its own username/password hashing and HttpOnly cookie session system; adopting Supabase Auth is a separate authentication migration, not required for moving the database.
