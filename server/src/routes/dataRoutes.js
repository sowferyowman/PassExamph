const router = require("express").Router();
const { getDb } = require("../config/database");

// Rankings must be assembled from each student's persisted record. Reading the
// browser's legacy store here made the result depend on which account had most
// recently signed in on that device.
router.get("/leaderboard", (_req, res) => {
  const rows = getDb().prepare(`
    SELECT users.id, users.email, users.username, users.name, users.nickname,
      dashboard.payload AS dashboard_payload,
      reviewer_progress.payload AS reviewer_progress_payload
    FROM users
    LEFT JOIN app_data AS dashboard ON dashboard.user_id = users.id
      AND dashboard.namespace = 'legacy' AND dashboard.data_key = 'acet_dashboard_data'
    LEFT JOIN app_data AS reviewer_progress ON reviewer_progress.user_id = users.id
      AND reviewer_progress.namespace = 'legacy' AND reviewer_progress.data_key = 'reviewer_progress'
    WHERE users.role = 'student' AND users.is_active = 1
  `).all();

  const leaderboard = rows.map((student) => {
    let dashboard = {};
    let progress = {};
    try {
      const store = JSON.parse(student.dashboard_payload || "{}");
      dashboard = store?.[student.email] || {};
    } catch (_error) { /* Ignore malformed legacy data for this one student. */ }
    try {
      const store = JSON.parse(student.reviewer_progress_payload || "{}");
      progress = store?.[student.email] || {};
    } catch (_error) { /* Ignore malformed legacy data for this one student. */ }

    const attempts = Array.isArray(dashboard.attempts) ? dashboard.attempts : [];
    const mockPoints = attempts.reduce((total, attempt) => total + Math.max(0, Number(attempt.earnedMockPoints ?? attempt.earnedPoints ?? 0)), 0);
    const completedModules = Object.values(progress).reduce((total, modules) => total + new Set(Array.isArray(modules) ? modules : []).size, 0);
    const latestScore = Number(attempts[0]?.finalPct ?? attempts[0]?.score ?? 0) || 0;
    return {
      id: student.id,
      email: student.email,
      name: student.nickname || student.name || student.username || student.email,
      totalPoints: mockPoints + completedModules * 75,
      latestScore
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || a.email.localeCompare(b.email));

  res.set("Cache-Control", "no-store");
  res.json(leaderboard.map((row, index) => ({ ...row, rank: index + 1 })));
});

router.get("/:namespace", (req, res) => {
  const rows = getDb().prepare("SELECT data_key AS key, payload, updated_at AS updatedAt FROM app_data WHERE user_id=? AND namespace=? ORDER BY data_key").all(req.user.id, req.params.namespace);
  res.json(rows.map((row) => ({ ...row, value: JSON.parse(row.payload) })));
});

router.post("/migrate", (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  const insert = getDb().prepare(`INSERT INTO app_data (user_id, namespace, data_key, payload, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, namespace, data_key) DO UPDATE SET payload=excluded.payload, updated_at=CURRENT_TIMESTAMP`);
  for (const record of records) if (record.namespace && record.key && record.value !== undefined) insert.run(req.user.id, record.namespace, record.key, JSON.stringify(record.value));
  res.json({ migrated: records.length });
});

router.put("/:namespace/:key", (req, res) => {
  const value = req.body?.value;
  if (value === undefined) return res.status(400).json({ error: "value is required" });
  getDb().prepare(`INSERT INTO app_data (user_id, namespace, data_key, payload, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, namespace, data_key) DO UPDATE SET payload=excluded.payload, updated_at=CURRENT_TIMESTAMP`).run(req.user.id, req.params.namespace, req.params.key, JSON.stringify(value));
  res.json({ namespace: req.params.namespace, key: req.params.key, value });
});

router.delete("/:namespace/:key", (req, res) => { getDb().prepare("DELETE FROM app_data WHERE user_id=? AND namespace=? AND data_key=?").run(req.user.id, req.params.namespace, req.params.key); res.json({ ok: true }); });

module.exports = router;
