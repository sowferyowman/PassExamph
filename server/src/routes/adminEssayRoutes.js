const router = require("express").Router();
const { getDb } = require("../config/database");
const { resetStudentPasswordByAdmin, updateProfile } = require("../services/authService");
const { randomUUID } = require("crypto");

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

// Admin data must come from each student's persisted dashboard, not the
// administrator browser's localStorage copy.
router.get("/student-dashboards", (_req, res) => {
  const rows = getDb().prepare(`
    SELECT users.email, app_data.payload
    FROM users
    LEFT JOIN app_data ON app_data.user_id = users.id
      AND app_data.namespace = 'legacy' AND app_data.data_key = 'acet_dashboard_data'
    WHERE users.role = 'student'
  `).all();
  const dashboards = {};
  rows.forEach((row) => {
    if (!row.payload) return;
    try {
      const store = JSON.parse(row.payload);
      // Each row belongs to one student. Old browser migrations may contain a
      // copy of other accounts too, so only trust the owner's dashboard here.
      if (store && typeof store === "object" && store[row.email]) dashboards[row.email] = store[row.email];
    } catch (_error) {
      // A malformed legacy value should not prevent the rest of the class list loading.
    }
  });
  res.json(dashboards);
});

router.get("/students/:studentId/exam-submissions", (req, res) => {
  const studentId = Number(req.params.studentId);
  const db = getDb();
  const student = db.prepare("SELECT id,email FROM users WHERE id=? AND role='student'").get(studentId);
  if (!student) return res.status(404).json({ error: "Student account not found." });

  const record = db.prepare("SELECT payload FROM app_data WHERE user_id=? AND namespace='legacy' AND data_key='acet_dashboard_data'").get(studentId);
  if (!record) return res.json({ attempts: [] });

  try {
    const store = JSON.parse(record.payload);
    const dashboard = store?.[student.email] || {};
    res.json({ attempts: Array.isArray(dashboard.attempts) ? dashboard.attempts : [] });
  } catch (_error) {
    res.status(500).json({ error: "The student's saved exam history could not be read." });
  }
});

router.patch("/students/:studentId/essay-responses/:essayId", (req, res) => {
  const studentId = Number(req.params.studentId);
  const { essayId } = req.params;
  const db = getDb();
  const student = db.prepare("SELECT id,email FROM users WHERE id=? AND role='student'").get(studentId);
  if (!student) return res.status(404).json({ error: "Student account not found." });
  const record = db.prepare("SELECT payload FROM app_data WHERE user_id=? AND namespace='legacy' AND data_key='acet_dashboard_data'").get(studentId);
  if (!record) return res.status(404).json({ error: "No saved exam history was found for this student." });

  try {
    const store = JSON.parse(record.payload);
    const dashboard = store?.[student.email];
    if (!dashboard) return res.status(404).json({ error: "No saved exam history was found for this student." });
    let updated = false;
    let updatedAttemptIndex = -1;
    let wasReviewed = false;
    dashboard.attempts = (dashboard.attempts || []).map((attempt, attemptIndex) => {
      const essayResponses = (attempt.essayResponses || []).map((essay) => {
        if (essay.id !== essayId) return essay;
        updated = true;
        return { ...essay, ...req.body };
      });
      if (!essayResponses.some((essay) => essay.id === essayId)) return attempt;
      updatedAttemptIndex = attemptIndex;
      wasReviewed = attempt.status === "Reviewed" && !attempt.hasPendingEssays;
      return recalculateEssayAttempt({ ...attempt, essayResponses });
    });
    if (!updated) return res.status(404).json({ error: "Essay response not found." });
    const updatedAttempt = dashboard.attempts[updatedAttemptIndex];
    // Keep the summary shown in Student Exam Records in sync with the reviewed attempt.
    if (updatedAttempt && Array.isArray(dashboard.exams)) {
      dashboard.exams = dashboard.exams.map((exam, index) => index === updatedAttemptIndex ? {
        ...exam,
        score: updatedAttempt.finalPct,
        finalPct: updatedAttempt.finalPct,
        earnedPoints: updatedAttempt.earnedPoints,
        totalPoints: updatedAttempt.totalPoints,
        passed: updatedAttempt.passed,
        status: updatedAttempt.status,
        hasPendingEssays: updatedAttempt.hasPendingEssays
      } : exam);
    }
    db.prepare("UPDATE app_data SET payload=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND namespace='legacy' AND data_key='acet_dashboard_data'").run(JSON.stringify(store), studentId);
    // Notify once, only after every essay in this attempt has been finalized.
    if (updatedAttempt?.status === "Reviewed" && !updatedAttempt.hasPendingEssays && !wasReviewed) {
      db.prepare("INSERT INTO user_notifications (id,user_id,payload) VALUES (?,?,?)").run(
        randomUUID(),
        studentId,
        JSON.stringify({
          id: randomUUID(), userId: studentId, type: "essay_reviewed",
          message: `Your essay for ${updatedAttempt.examTitle || "your mock exam"} has been reviewed. Your final result is ready.`,
          isRead: false, timestamp: Date.now(),
          metadata: { attemptId: updatedAttempt.id, examId: updatedAttempt.examId }
        })
      );
    }
    res.json({ ok: true, attempt: updatedAttempt, dashboard });
  } catch (_error) {
    res.status(500).json({ error: "Could not update the saved exam score." });
  }
});

function recalculateEssayAttempt(attempt) {
  const essays = Array.isArray(attempt.essayResponses) ? attempt.essayResponses : [];
  const essayIds = new Set(essays.map((essay) => essay.questionId).filter(Boolean));
  const items = (attempt.itemDiagnostics || []).map((item) => {
    const essay = essays.find((entry) => entry.questionId && entry.questionId === item.questionId);
    if (!essay) return item;
    const awarded = essay.status === "approved" && Number.isFinite(Number(essay.finalScore)) ? Number(essay.finalScore) : 0;
    return { ...item, points: Number(essay.points || 0), earnedPoints: awarded };
  });
  const mcq = items.filter((item) => !essayIds.has(item.questionId) && item.questionType !== "paragraph" && item.questionType !== "essay");
  const mcqTotal = mcq.reduce((sum, item) => sum + Math.max(0, Number(item.points || 0)), 0);
  const mcqEarned = mcq.reduce((sum, item) => sum + Math.max(0, Number(item.earnedPoints || 0)), 0);
  const essayTotal = essays.reduce((sum, essay) => sum + Math.max(0, Number(essay.points || 0)), 0);
  const essayEarned = essays.reduce((sum, essay) => sum + Math.max(0, essay.status === "approved" && Number.isFinite(Number(essay.finalScore)) ? Number(essay.finalScore) : 0), 0);
  const totalPoints = mcqTotal + essayTotal;
  const earnedPoints = mcqEarned + essayEarned;
  const finalPct = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : Number(attempt.finalPct || 0);
  const reviewed = essays.length > 0 && essays.every((essay) => essay.status === "approved");
  return { ...attempt, itemDiagnostics: items, earnedPoints, totalPoints, finalPct, passed: finalPct >= Number(attempt.passingScore || 75), status: reviewed ? "Reviewed" : "Pending Review", hasPendingEssays: !reviewed };
}

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
  if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) return res.status(400).json({ error: "Enter a valid email address." });
  const updatedUser = updateProfile(studentId, { name, nickname, school, phoneNumber: smsNumber, recoveryEmail });
  res.json({ user: updatedUser });
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
      response, rubric, points, ai_score AS aiScore, ai_rationale AS aiRationale, final_score AS finalScore, status, created_at AS createdAt
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
