# Features and data ownership

Students use server-authenticated accounts, timed exams, results, reviewers, drills, a forum, and notifications. Administrators manage shared reviewer and exam catalogs, student/essay workflows, and drills.

| Data | Current owner |
| --- | --- |
| Exams and reviewers | `shared_content`; only admins may write through `/api/content`. |
| Forum threads, replies, reactions | `shared_content`; any authenticated user may interact. |
| Notifications | `user_notifications`, tied to a recipient. |
| Auth and recovery | SQLite auth tables and HttpOnly cookies. |
| Dashboard, reviewer progress, legacy drills | Per-user `app_data` blobs hydrated to browser storage. |
| Sidebar state and reviewer scroll/resume | Browser-only local storage. |

The client still uses `storage.js` as a cache and domain helper. See [MIGRATION.md](MIGRATION.md) for the boundary between live server records and legacy storage.
