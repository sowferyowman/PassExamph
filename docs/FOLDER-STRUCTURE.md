# Folder structure

```text
ACET-DEMO-MVP/
├── client/                 # React/Vite web application
│   ├── public/images/       # Landing-page and other static image assets
│   ├── src/
│   │   ├── api/             # Axios clients for API endpoints
│   │   ├── components/      # Reusable shared UI
│   │   ├── context/         # Authentication context
│   │   ├── features/        # Domain UI: dashboard, exams, community
│   │   ├── layouts/         # Shared page shells and navigation
│   │   ├── pages/           # Route-level screens
│   │   ├── services/        # Client persistence and domain helpers
│   │   └── styles/          # Global Tailwind/CSS styles
│   ├── .env.example         # Safe client configuration template
│   └── vite.config.js       # Vite development proxy/build configuration
├── server/                  # Express API
│   ├── data/                # Runtime SQLite database location (ignored by Git)
│   ├── src/
│   │   ├── config/          # SQLite connection and schema setup
│   │   ├── data/            # Seed data
│   │   ├── middleware/      # Authentication middleware
│   │   ├── routes/          # HTTP route handlers
│   │   └── services/        # Authentication, AI, email, SMS, exam logic
│   └── .env.example         # Safe server configuration template
├── docs/                    # Project and deployment documentation
├── package.json             # Workspace scripts and API dependencies
└── knip.json                # Unused-code audit configuration
```

Do not commit `node_modules`, `client/dist`, `.env` files, or SQLite database files. The root `.gitignore` already excludes them.
