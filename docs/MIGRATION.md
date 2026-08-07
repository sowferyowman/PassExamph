# Data audit and migration path

This is an audit of the current codebase.

## 1. Authentication

Authentication is server-side. `server/src/services/authService.js` uses `users`, `sessions`, `login_history`, `password_reset_tokens`, and `email_verification_tokens`; their schema is created in `server/src/config/database.js:33-41` and `180-183`. Auth routes set HttpOnly cookies (`server/src/routes/authRoutes.js:16-32`), while `middleware/auth.js:8-14` verifies the access-token cookie and reloads the user from SQLite.

The client does keep public UI snapshots in localStorage: `currentActiveUser` and `exams_ph_current_user` (`client/src/services/storage.js:3-4`, `453-454`). They are not the server authorization credential, but they are still used by UI helpers.

## 2. SQL-backed request paths

`dashboardService.js` reads `exam_logs`, `student_profiles`, `dashboard_metrics`, `progression`, `subjects`, `study_plan`, `rewards`, and `ai_insights` for `/api/dashboard`. `examService.js` writes `exam_logs`, `progression`, `subjects`, and `essay_responses` for `/api/exams/attempts`. `exam_sessions` backs the live session endpoints; `drill_sessions` backs `/api/drills/sessions`.

These tables are live, not seed-only. The client nevertheless primarily saves current completed-attempt dashboard data through the `app_data` blob path, so the project currently has overlapping legacy and typed data models.

## 3. Shared content

`shared_content` stores shared reviewers, exams, and forum payloads (`database.js:193-199`). `user_notifications` stores recipient-scoped notifications (`database.js:200-206`). `/api/content` uses `authenticate` (`server.js:29`). `contentRoutes.js:15`, `59-72` restrict reviewer and exam catalog writes to admins. Forum thread/reply/reaction routes at `74-94` are available to authenticated users.

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

There is no built-in cloud sync. `http.js:4` uses `VITE_API_BASE_URL || "/api"`; `database.js:14` defaults to a local SQLite path. Devices share live data only when they call the same running/deployed API/database. Copying the repository copies a database snapshot.

## 6. Supabase/Firebase migration sequence

1. Move identity/profile ownership to Supabase Auth + profiles or Firebase Auth + user documents.
2. Replace `shared_content` with typed exam, reviewer, forum-thread, reply, and reaction tables/collections. Enforce admin writes with RLS/security rules.
3. Move notifications to recipient rows/documents and use subscriptions for real-time badges.
4. Replace `app_data` blobs with typed attempts, scores, reviewer progress, drill sessions, and dashboard projections.
5. Choose one authoritative exam/dashboard model; retire or migrate duplicate `exam_logs`/`progression` paths deliberately.
6. Replace `writeJson` fire-and-forget requests with explicit awaited repository/API calls.

Run a backup, idempotent per-user migration, validation pass, and rollback plan before cutover.
