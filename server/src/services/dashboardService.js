const { getDb } = require("../config/database");

function getDashboardSummary(studentId = 1) {
  const db = getDb();

  const latestLog = db.prepare(
    "SELECT score FROM exam_logs WHERE student_id = ? AND status != 'Pending Review' ORDER BY taken_at DESC, id DESC LIMIT 1"
  ).get(studentId);
  const latestScoreStr = latestLog ? `${latestLog.score}%` : "0%";

  const totalCountRow = db.prepare(
    "SELECT COUNT(*) AS total FROM exam_logs WHERE student_id = ?"
  ).get(studentId);
  const totalTests = totalCountRow ? totalCountRow.total : 0;

  const profile = db.prepare(`
    SELECT display_name AS displayName, target_school AS targetSchool
    FROM student_profiles
    WHERE user_id = ?
  `).get(studentId);

  const storedMetrics = db.prepare(`
    SELECT label, value, detail, accent
    FROM dashboard_metrics
    WHERE student_id = ?
    ORDER BY id
  `).all(studentId);

  const progression = db.prepare("SELECT label, score FROM progression WHERE student_id = ? ORDER BY id").all(studentId);
  const subjects = db.prepare("SELECT name, mastery, color FROM subjects WHERE student_id = ? ORDER BY id").all(studentId);
  const exams = db.prepare("SELECT name, taken_at AS takenAt, score, status FROM exam_logs WHERE student_id = ? ORDER BY taken_at DESC, id DESC").all(studentId);
  const studyPlan = db.prepare("SELECT day, title, detail, status FROM study_plan WHERE student_id = ? ORDER BY id").all(studentId);
  const rewards = db.prepare("SELECT title, description, points FROM rewards WHERE student_id = ? ORDER BY id").all(studentId);
  const aiInsight = db.prepare(`
    SELECT title, priority, detail
    FROM ai_insights
    WHERE student_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(studentId);

  const hasDashboardData = progression.length > 0 || subjects.length > 0 || exams.length > 0;

  return {
    student: {
      id: studentId,
      displayName: profile?.displayName || "Student",
      targetSchool: profile?.targetSchool || "Ateneo de Manila University"
    },
    hasDashboardData,
    stats: [
      { label: "Latest Mock Score", value: latestScoreStr, detail: "Calculated from your last live testing block", accent: "blue" },
      { label: "Total Tests Taken", value: String(totalTests), detail: `${totalTests * 3} hours of operational runtime`, accent: "purple" },
      ...storedMetrics
    ],
    // Older records may already have a point inserted for a pending ACET mock.
    // Hide those legacy points as well as preventing new ones at submission time.
    progression: progression.filter((point) => {
      const mockNumber = /^Mock (\d+)$/.exec(point.label)?.[1];
      return !mockNumber || !exams.some((exam) => exam.status === "Pending Review" && exam.name === `ACET Mock Practice #${mockNumber}`);
    }),
    subjects,
    exams,
    studyPlan,
    rewards,
    aiInsight
  };
}

module.exports = { getDashboardSummary };
