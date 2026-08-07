# Environment configuration

Copy the safe templates; never commit `.env` files.

| Server variable | Purpose |
| --- | --- |
| `NODE_ENV`, `PORT`, `CLIENT_ORIGIN` | Runtime mode, API port, and CORS origin. |
| `SQLITE_PATH` | Optional DB path; default is `server/data/acet.sqlite`. |
| `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_PASSWORD` | Required administrator bootstrap values. |
| `JWT_SECRET` | Required production signing secret. |
| `GROQ_API_KEY` | Optional AI integration. |
| `SMTP_*`, `TWILIO_*` | Optional recovery integrations. |

| Client variable | Purpose |
| --- | --- |
| `VITE_DEV_PORT`, `VITE_API_PROXY_TARGET` | Local Vite configuration. |
| `VITE_API_BASE_URL` | API base URL; `/api` behind a reverse proxy. |

Only `VITE_*` values are exposed to the browser. Never place secrets in `client/.env`.
