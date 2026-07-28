const router = require("express").Router();
const { getDb } = require("../config/database");
const { resetStudentPasswordByAdmin } = require("../services/authService");

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
}

router.use(requireAdmin);

router.get("/students", (_req, res) => {
  const students = getDb().prepare(`
    SELECT users.id, users.email, users.username, users.name, users.nickname, users.sms_number AS smsNumber,
      users.recovery_email AS recoveryEmail, users.is_active AS isActive,
      COALESCE(student_profiles.display_name, users.name, users.username, users.email) AS displayName,
      student_profiles.target_school AS school,
      users.created_at AS createdAt
    FROM users
    LEFT JOIN student_profiles ON student_profiles.user_id = users.id
    WHERE users.role = 'student'
    ORDER BY users.created_at DESC
  `).all();
  res.json(students);
});

router.patch("/students/:studentId", (req, res) => {
  const studentId = Number(req.params.studentId);
  const student = getDb().prepare("SELECT id FROM users WHERE id=? AND role='student'").get(studentId);
  if (!student) return res.status(404).json({ error: "Student account not found." });
  const name = String(req.body?.name || "").trim();
  const nickname = String(req.body?.nickname || "").trim();
  const school = String(req.body?.school || "").trim();
  const smsNumber = String(req.body?.smsNumber || "").trim();
  const recoveryEmail = String(req.body?.recoveryEmail || "").trim().toLowerCase();
  if (smsNumber && !/^\+?\d{10,15}$/.test(smsNumber.replace(/[\s()-]/g, ""))) return res.status(400).json({ error: "Enter a valid mobile number." });
  if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) return res.status(400).json({ error: "Enter a valid recovery email." });
  const db = getDb();
  db.prepare("UPDATE users SET name=CASE WHEN ? <> '' THEN ? ELSE name END,nickname=?,phone_number=?,sms_number=?,recovery_email=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(name, name, nickname || null, smsNumber || null, smsNumber || null, recoveryEmail || null, studentId);
  const profile = db.prepare("SELECT user_id FROM student_profiles WHERE user_id=?").get(studentId);
  if (profile) db.prepare("UPDATE student_profiles SET display_name=CASE WHEN ? <> '' THEN ? ELSE display_name END,target_school=? WHERE user_id=?").run(name, name, school, studentId);
  else db.prepare("INSERT INTO student_profiles (user_id,display_name,target_school) VALUES (?,?,?)").run(studentId, name || "Student", school);
  res.json({ ok: true });
});

router.post("/students/:studentId/reset-password", async (req, res) => {
  try {
    const temporaryPassword = await resetStudentPasswordByAdmin(Number(req.params.studentId));
    res.json({ temporaryPassword });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.delete("/students/:studentId", (req, res) => {
  const studentId = Number(req.params.studentId);
  const db = getDb();
  const student = db.prepare("SELECT id FROM users WHERE id=? AND role='student'").get(studentId);
  if (!student) return res.status(404).json({ error: "Student account not found." });
  db.prepare("DELETE FROM student_profiles WHERE user_id=?").run(studentId);
  db.prepare("DELETE FROM users WHERE id=?").run(studentId);
  res.json({ ok: true });
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
