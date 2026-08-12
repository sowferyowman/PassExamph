# PostgreSQL migration status

The active backend uses PostgreSQL through `server/src/config/database.pg.js`. The legacy SQLite helper remains in `server/src/config/database.js` for historical reference only; no active route or service imports it.

## 1. Authentication

Authentication is server-side. `server/src/services/authService.js` uses `users`, `sessions`, `login_history`, `password_reset_tokens`, and `email_verification_tokens`; their PostgreSQL schema is in `supabase/schema.sql`. Auth routes set HttpOnly cookies, while `middleware/auth.js` verifies the access-token cookie and reloads the user from PostgreSQL.

The client does keep public UI snapshots in localStorage: `currentActiveUser` and `exams_ph_current_user` (`client/src/services/storage.js:3-4`, `453-454`). They are not the server authorization credential, but they are still used by UI helpers.

## 2. SQL-backed request paths

`dashboardService.js` reads `exam_logs`, `student_profiles`, `dashboard_metrics`, `progression`, `subjects`, `study_plan`, `rewards`, and `ai_insights` for `/api/dashboard`. `examService.js` writes `exam_logs`, `progression`, `subjects`, and `essay_responses` for `/api/exams/attempts`. `exam_sessions` backs the live session endpoints; `drill_sessions` backs `/api/drills/sessions`.

These tables are live, not seed-only. The client nevertheless primarily saves current completed-attempt dashboard data through the `app_data` blob path, so the project currently has overlapping legacy and typed data models.

## 3. Shared content

`shared_content` stores shared reviewers, exams, and forum payloads. `user_notifications` stores recipient-scoped notifications. Both are PostgreSQL JSONB tables in `supabase/schema.sql`.

## 4. Generic blob store and live browser keys

`writeJson` (`storage.js:344-350`) updates localStorage and asynchronously PUTs `/api/data/legacy/:key`, except auth keys and reviewers. Current live keys:

| Key | Role |
| --- | --- |
| `global_exam_blueprints` | Client catalog/cache; shared version also loads from `/api/content/exams`. |
| `reviewersData` | Client cache; shared version uses `/api/content/reviewers`. |
| `acet_dashboard_data` | Per-user dashboard and attempt blobs. |
| `drillBankData` | Client drill bank. |
| `drillSessionsData` | Per-user drill-session cache. |
| `reviewer_progress` | Per-user completion cache. |
| `notificationsData` | Client cache hydrated from server notifications. |
| `forumPosts` | Client cache hydrated from shared forum data. |
| `examsData`, `studyPlanData` | Client seed/configuration inputs. |
| `currentActiveUser`, `exams_ph_current_user` | Browser UI snapshots, excluded from generic sync. |

Browser-only keys also include student/admin sidebar preferences and reviewer resume position. `acet_forum_threads` is declared but no live read/write call exists.

The following names have zero current references in `client/src` and `server/src`: `createStudentAccount`, `USER_ACCOUNTS_KEY`, `getUserAccounts`, `hydrateDashboardStoreFromServer`, `EXAM_HISTORY_RESET_KEY`, and `STAN_DASHBOARD_RESET_KEY`.

## 5. Cross-device limit

`VITE_API_BASE_URL` selects the deployed API base URL. Devices share live data when they call the same deployed API and PostgreSQL database.

## 6. Deployment sequence

1. Apply `supabase/schema.sql`.
2. Apply `supabase/seed.sql`.
3. Configure Render with `DATABASE_URL` and server environment variables.
4. Configure Vercel with `VITE_API_BASE_URL` pointing to the Render `/api` URL.
