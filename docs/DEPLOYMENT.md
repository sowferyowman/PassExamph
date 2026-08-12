# Vercel + Render deployment

Do not deploy `server/.env` or client environment files. Configure all values in the Vercel and Render dashboards.

## PostgreSQL setup

Apply the tracked SQL in this order to the production PostgreSQL/Supabase database:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

The seed creates or updates the required `exam_blueprint` row. Do not run `supabase/drop-orphaned-tables.sql` as part of normal deployment.

## Render backend

- Root directory: repository root
- Build command: `npm install`
- Start command: `npm run server:start`
- Health check path: `/api/health`
- Render supplies `PORT`; the server listens on `HOST` or `0.0.0.0`.

Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, all `DEFAULT_ADMIN_*` values, `CLIENT_ORIGIN` (or `CLIENT_ORIGINS`), and `COOKIE_SAME_SITE=none`. Set optional Groq, SMTP, and Twilio variables only when those integrations are configured.

## Vercel frontend

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist` (Vite default)
- Set `VITE_API_BASE_URL` to the public Render API URL including `/api`, for example `https://your-service.onrender.com/api`.

## CORS and cookies

The frontend uses HttpOnly access and refresh cookies with `withCredentials`. For separately hosted Vercel and Render domains, the backend must allow the exact Vercel origin through `CLIENT_ORIGIN`/`CLIENT_ORIGINS`, and production cookies use `Secure; SameSite=None`.

Some browsers block third-party cookies even with `SameSite=None`; a Vercel `*.vercel.app` frontend and Render `*.onrender.com` API can therefore be unreliable for cookie authentication. Use custom frontend/API domains under the same registrable domain, or make an explicit token-based authentication redesign before public launch.

## AI without Groq

`GROQ_API_KEY` is optional. Existing AI diagnostic endpoints fall back locally; essay scoring remains pending review when Groq is unavailable.
