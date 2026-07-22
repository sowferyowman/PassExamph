const router = require("express").Router();
const { getDb } = require("../config/database");

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}

router.use(requireAdmin);

router.get("/students", (_req, res) => {
  const students = getDb().prepare(`SELECT users.id, users.email, student_profiles.display_name AS displayName, users.created_at AS createdAt FROM users LEFT JOIN student_profiles ON student_profiles.user_id = users.id WHERE users.role = 'student' ORDER BY users.created_at DESC`).all();
  res.json(students);
});

router.get("/essays/pending", (_req, res) => {
  const rows = getDb().prepare(`
    SELECT id, student_id AS studentId, exam_name AS examName, question_index AS questionIndex,
      response, rubric, points, ai_score AS aiScore, final_score AS finalScore, status, created_at AS createdAt
    FROM essay_responses WHERE status IN ('pending_review', 'ai_graded') ORDER BY created_at ASC
  `).all();
  res.json(rows);
});

router.post("/essays/approve", (req, res) => {
  const { id, decision = "approve", score } = req.body || {};
  if (!id) return res.status(400).json({ error: "Essay id is required." });
  const db = getDb();
  const essay = db.prepare("SELECT * FROM essay_responses WHERE id = ?").get(id);
  if (!essay) return res.status(404).json({ error: "Essay response not found." });
  if (decision === "reject") {
    db.prepare("UPDATE essay_responses SET status = 'pending_review', final_score = NULL, reviewed_at = NULL WHERE id = ?").run(id);
  } else {
    const finalScore = Number.isFinite(Number(score)) ? Number(score) : Number(essay.ai_score);
    if (!Number.isFinite(finalScore)) return res.status(400).json({ error: "A numeric score is required." });
    db.prepare("UPDATE essay_responses SET status = 'approved', final_score = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?").run(finalScore, id);
    if (essay.exam_log_id) {
      const remaining = db.prepare("SELECT COUNT(*) AS total FROM essay_responses WHERE exam_log_id = ? AND status != 'approved'").get(essay.exam_log_id).total;
      if (!remaining) db.prepare("UPDATE exam_logs SET status = 'Reviewed' WHERE id = ?").run(essay.exam_log_id);
    }
  }
  res.json(db.prepare("SELECT * FROM essay_responses WHERE id = ?").get(id));
});

module.exports = router;
