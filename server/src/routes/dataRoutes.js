const router = require("express").Router();
const { pool } = require("../config/database.pg");

// Rankings must be assembled from each student's persisted record. Reading the
// browser's legacy store here made the result depend on which account had most
// recently signed in on that device.
router.get("/leaderboard", async (_req, res, next) => {
  try {
    const rows = (await pool.query(`
    SELECT users.id, users.email, users.username, users.name, users.nickname,
      dashboard.payload AS dashboard_payload,
      reviewer_progress.payload AS reviewer_progress_payload
    FROM users
    LEFT JOIN app_data AS dashboard ON dashboard.user_id = users.id
      AND dashboard.namespace = $1 AND dashboard.data_key = $2
    LEFT JOIN app_data AS reviewer_progress ON reviewer_progress.user_id = users.id
      AND reviewer_progress.namespace = $3 AND reviewer_progress.data_key = $4
    WHERE users.role = $5 AND users.is_active = TRUE
    `, ["legacy", "acet_dashboard_data", "legacy", "reviewer_progress", "student"])).rows;

    const leaderboard = rows.map((student) => {
      let dashboard = {};
      let progress = {};
      try {
        const store = typeof student.dashboard_payload === "string" ? JSON.parse(student.dashboard_payload || "{}") : student.dashboard_payload || {};
        dashboard = store?.[student.email] || {};
      } catch (_error) { /* Ignore malformed legacy data for this one student. */ }
      try {
        const store = typeof student.reviewer_progress_payload === "string" ? JSON.parse(student.reviewer_progress_payload || "{}") : student.reviewer_progress_payload || {};
        progress = store?.[student.email] || {};
      } catch (_error) { /* Ignore malformed legacy data for this one student. */ }

      const attempts = Array.isArray(dashboard.attempts) ? dashboard.attempts : [];
      const mockPoints = attempts.reduce((total, attempt) => total + Math.max(0, Number(attempt.earnedMockPoints ?? attempt.earnedPoints ?? 0)), 0);
      const completedModules = Object.values(progress).reduce((total, modules) => total + new Set(Array.isArray(modules) ? modules : []).size, 0);
      const latestScore = Number(attempts[0]?.finalPct ?? attempts[0]?.score ?? 0) || 0;
      return {
        id: Number(student.id),
        email: student.email,
        name: student.nickname || student.name || student.username || student.email,
        totalPoints: mockPoints + completedModules * 75,
        latestScore
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints || a.email.localeCompare(b.email));

    res.set("Cache-Control", "no-store");
    res.json(leaderboard.map((row, index) => ({ ...row, rank: index + 1 })));
  } catch (error) {
    next(error);
  }
});

router.get("/:namespace", async (req, res, next) => {
  try {
    const rows = (await pool.query("SELECT data_key AS key, payload, updated_at AS \"updatedAt\" FROM app_data WHERE user_id = $1 AND namespace = $2 ORDER BY data_key", [req.user.id, req.params.namespace])).rows;
    res.json(rows.map((row) => ({ ...row, value: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload })));
  } catch (error) {
    next(error);
  }
});

router.post("/migrate", async (req, res, next) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  try {
    for (const record of records) {
      if (record.namespace && record.key && record.value !== undefined) {
        await pool.query("INSERT INTO app_data (user_id, namespace, data_key, payload, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT(user_id, namespace, data_key) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP", [req.user.id, record.namespace, record.key, JSON.stringify(record.value)]);
      }
    }
    res.json({ migrated: records.length });
  } catch (error) {
    next(error);
  }
});

router.put("/:namespace/:key", async (req, res, next) => {
  const value = req.body?.value;
  if (value === undefined) return res.status(400).json({ error: "value is required" });
  try {
    await pool.query("INSERT INTO app_data (user_id, namespace, data_key, payload, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT(user_id, namespace, data_key) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP", [req.user.id, req.params.namespace, req.params.key, JSON.stringify(value)]);
    res.json({ namespace: req.params.namespace, key: req.params.key, value });
  } catch (error) {
    next(error);
  }
});

router.delete("/:namespace/:key", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM app_data WHERE user_id = $1 AND namespace = $2 AND data_key = $3", [req.user.id, req.params.namespace, req.params.key]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
