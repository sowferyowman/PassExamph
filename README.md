# ACET Demo MVP

PassExams.ph is an adaptive examination-preparation MVP for Philippine entrance exams. It has a React/Vite client, an Express API, and a local SQLite database.

## Quick start

```bash
git clone <repository-url>
cd ACET-DEMO-MVP
copy server\.env.example server\.env
copy client\.env.example client\.env
npm run install:all
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`.

## Documentation

- [Installation guide](docs/INSTALLATION.md)
- [Features](docs/FEATURES.md)
- [Folder structure](docs/FOLDER-STRUCTURE.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Deployment, domain, HTTPS, and database migration](docs/DEPLOYMENT.md)

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run install:all` | Install root/server and client dependencies. |
| `npm run dev` | Start the API and Vite development server together. |
| `npm run client:build` | Create a production client build. |
| `npm run server:start` | Start the Express API. |
| `npm run knip` | Audit unused files, exports, and dependencies. |

## Contribution workflow

```bash
git checkout -b your-branch
git pull origin <base-branch>
# make and test changes
git add .
git commit -m "feat: describe the change"
git push origin your-branch
```

Use conventional prefixes such as `feat`, `fix`, `docs`, `refactor`, `test`, and `chore`.
