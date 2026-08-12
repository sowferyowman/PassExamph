# Environment configuration

Copy the safe templates; never commit `.env` files. The backend requires PostgreSQL and does not use a local SQLite path.

| Server variable | Purpose |
| --- | --- |
| `NODE_ENV`, `PORT`, `HOST` | Runtime mode, Render-assigned port, and listener host. |
| `DATABASE_URL`, `PG_SSL` | PostgreSQL connection string and optional explicit SSL enablement. Production enables SSL automatically. |
| `CLIENT_ORIGIN`, `CLIENT_ORIGINS` | Exact allowed frontend origin, or a comma-separated allowlist for CORS. |
| `COOKIE_SAME_SITE` | Cookie policy. Use `none` for a separately hosted Vercel frontend and HTTPS Render API. |
| `JWT_SECRET` | Required signing secret; the server refuses to start without it. |
| `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_PASSWORD` | Required administrator bootstrap values. |
| `GROQ_API_KEY` | Optional Groq integration; AI endpoints use existing fallbacks when unavailable. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional email recovery. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Optional SMS recovery. |
| `DEV_STUDENT_ID` | Development-only fallback; production rejects unauthenticated student context. |

| Client variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Required on Vercel: the public Render backend URL including `/api`. |
| `VITE_DEV_PORT`, `VITE_API_PROXY_TARGET` | Local Vite development server and proxy settings. |

Only `VITE_*` values are exposed to the browser. Never put API keys, database URLs, or JWT secrets in the client environment.
