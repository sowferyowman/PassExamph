const router = require("express").Router();
const { pool } = require("../config/database.pg");

router.get("/sessions", async (req, res, next) => {
  try {
    const rows = (await pool.query(`SELECT id, subject, score, correct, total, best_streak AS "bestStreak", points, responses, weakness_focus AS "weaknessFocus", created_at AS "createdAt" FROM drill_sessions WHERE student_id = $1 ORDER BY id DESC LIMIT 25`, [req.user.id])).rows;
    res.json(rows.map((row) => ({ ...row, id: Number(row.id), responses: typeof row.responses === "string" ? JSON.parse(row.responses || "[]") : row.responses, weaknessFocus: typeof row.weaknessFocus === "string" ? JSON.parse(row.weaknessFocus || "[]") : row.weaknessFocus })));
  } catch (error) {
    next(error);
  }
});

router.post("/sessions", async (req, res, next) => {
  const { subject, pct = 0, correct = 0, total = 0, bestStreak = 0, points = 0, responses = [], weaknessFocus = [] } = req.body || {};
  if (!subject) return res.status(400).json({ error: "subject is required" });
  try {
    const result = await pool.query(`INSERT INTO drill_sessions (student_id, subject, score, correct, total, best_streak, points, responses, weakness_focus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`, [req.user.id, subject, Number(pct), Number(correct), Number(total), Number(bestStreak), Number(points), JSON.stringify(responses), JSON.stringify(weaknessFocus)]);
    res.status(201).json({ id: Number(result.rows[0].id), subject, pct, correct, total, bestStreak, points, responses, weaknessFocus });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
