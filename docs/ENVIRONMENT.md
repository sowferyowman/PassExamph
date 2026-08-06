# Environment variables

Copy the provided templates before setting secrets:

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env
```

Never commit either `.env` file. Only variables prefixed with `VITE_` are exposed to browser code; never put credentials in `client/.env`.

## Server (`server/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | `development` locally; `production` when deployed. |
| `PORT` | Yes | Express API port; defaults to `4000`. |
| `CLIENT_ORIGIN` | Yes in production | Exact client origin allowed by CORS, such as `https://app.example.com`. |
| `SQLITE_PATH` | Recommended | Absolute production path for the SQLite database file. |
| `DEFAULT_ADMIN_EMAIL` | Yes | Initial administrator account email. |
| `DEFAULT_ADMIN_USERNAME` | Yes | Initial administrator username. |
| `DEFAULT_ADMIN_NAME` | Yes | Initial administrator display name. |
| `DEFAULT_ADMIN_PASSWORD` | Yes | Initial administrator password; use a secret manager in production. |
| `JWT_SECRET` | Yes | Long, unique signing secret for session tokens. |
| `GROQ_API_KEY` | Optional | Enables AI diagnostics. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Enables email password recovery. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Optional | Enables SMS password recovery. |

## Client (`client/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_DEV_PORT` | Optional | Local Vite port; defaults to `5173`. |
| `VITE_API_PROXY_TARGET` | Optional | Local API proxy target; defaults to `http://localhost:4000`. |
| `VITE_API_BASE_URL` | Yes for separate frontend/API domains | API prefix used by Axios. Use `/api` behind one reverse proxy, or `https://api.example.com/api` for a separate API domain. |
