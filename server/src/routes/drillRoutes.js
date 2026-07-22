const router = require("express").Router();
const { getDb } = require("../config/database");

router.get("/sessions", (req, res) => {
  const rows = getDb().prepare(`SELECT id, subject, score, correct, total, best_streak AS bestStreak, points, responses, weakness_focus AS weaknessFocus, created_at AS createdAt FROM drill_sessions WHERE student_id = ? ORDER BY id DESC LIMIT 25`).all(req.user.id);
  res.json(rows.map((row) => ({ ...row, responses: JSON.parse(row.responses || "[]"), weaknessFocus: JSON.parse(row.weaknessFocus || "[]") })));
});

router.post("/sessions", (req, res) => {
  const { subject, pct = 0, correct = 0, total = 0, bestStreak = 0, points = 0, responses = [], weaknessFocus = [] } = req.body || {};
  if (!subject) return res.status(400).json({ error: "subject is required" });
  const result = getDb().prepare(`INSERT INTO drill_sessions (student_id, subject, score, correct, total, best_streak, points, responses, weakness_focus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, subject, Number(pct), Number(correct), Number(total), Number(bestStreak), Number(points), JSON.stringify(responses), JSON.stringify(weaknessFocus));
  res.status(201).json({ id: result.lastInsertRowid, subject, pct, correct, total, bestStreak, points, responses, weaknessFocus });
});

module.exports = router;
