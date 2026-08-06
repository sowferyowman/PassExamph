# Installation guide

## Requirements

- Node.js 22 LTS or later. The server uses Node's built-in `node:sqlite` API.
- npm 10 or later.
- A Git client.

Optional integrations require their own accounts and credentials: Groq, SMTP, and Twilio.

## Set up locally

```bash
git clone <repository-url>
cd ACET-DEMO-MVP
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run install:all
```

Open `server/.env` and set at least the admin credentials and `JWT_SECRET`. Generate a long random secret; do not use the sample or commit this file.

```bash
npm run dev
```

The client is available at `http://localhost:5173`; the API is at `http://localhost:4000`. Vite proxies browser requests from `/api` to the local API.

## Production build

```bash
npm run client:build
npm run server:start
```

The static client output is written to `client/dist`. See [Deployment](DEPLOYMENT.md) for serving it with an API reverse proxy, a domain, and HTTPS.

## Verification

```bash
npm run knip
npm run client:build
```

`knip` may report intentionally dynamic imports; review findings before deleting code or packages.
