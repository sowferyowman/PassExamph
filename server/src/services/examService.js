const { getDb } = require("../config/database");
const { scoreEssay } = require("./aiService");

function getExamBlueprint() {
  const row = getDb().prepare("SELECT payload FROM exam_blueprint WHERE id = 1").get();
  return JSON.parse(row.payload);
}

function scoreExamAttempt(responses, studentId = 1) {
  const db = getDb();
  const blueprint = getExamBlueprint();
  let correct = 0;
  let total = 0;

  const subjectScores = blueprint
    .filter((section) => section.questions.some((question) => question.type === "mcq"))
    .map((section, sectionIndex) => {
      const sectionResponses = responses[sectionIndex] || [];
      let sectionCorrect = 0;
      let sectionTotal = 0;

      section.questions.forEach((question, questionIndex) => {
        if (question.type !== "mcq") return;
        sectionTotal += 1;
        total += 1;
        if (sectionResponses[questionIndex] === question.answerIdx) {
          sectionCorrect += 1;
          correct += 1;
        }
      });

      return {
        title: section.subjectTitle,
        correct: sectionCorrect,
        total: sectionTotal,
        pct: Math.round((sectionCorrect / sectionTotal) * 100)
      };
    });

  const finalPct = total ? Math.round((correct / total) * 100) : 0;
  
  try {
    const insertLog = db.prepare(`
      INSERT INTO exam_logs (student_id, name, taken_at, score, status) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const attemptCount = db
      .prepare("SELECT COUNT(*) AS total FROM exam_logs WHERE student_id = ?")
      .get(studentId).total;
    
    const currentDate = new Date().toISOString().split("T")[0];
    const examName = `ACET Mock Practice #${attemptCount + 1}`;
    
    const hasEssays = blueprint.some((section) => (section.questions || []).some((question) => question.type === "paragraph" || question.type === "essay"));
    insertLog.run(studentId, examName, currentDate, finalPct, hasEssays ? "Pending Review" : "Analyzed");

    // Essay-backed attempts are incomplete until their responses are reviewed.
    // Do not plot their MCQ-only subtotal as a completed progression score.
    if (!hasEssays) {
      db.prepare("INSERT INTO progression (student_id, label, score) VALUES (?, ?, ?)")
        .run(studentId, `Mock ${attemptCount + 1}`, finalPct);
    }

    const upsertSubject = db.prepare(`
      INSERT INTO subjects (student_id, name, mastery, color)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, name) DO UPDATE SET mastery = excluded.mastery
    `);

    subjectScores.forEach((subject) => {
      upsertSubject.run(studentId, subject.title, subject.pct, getSubjectColor(subject.pct));
    });

    saveEssayResponses(responses, studentId, examName);
  } catch (error) {
    console.error("Failed to write exam log record to database:", error);
  }

  const weaknesses = subjectScores
    .filter((subject) => subject.pct < 80)
    .map((subject) => ({
      ...subject,
      topicFocus: subject.title.includes("Math")
        ? "Algebra and geometry"
        : subject.title.includes("Logic")
          ? "Syllogisms and deductions"
          : subject.title.includes("English")
            ? "Vocabulary and grammar"
            : "Spatial recognition"
    }));

  return {
    finalPct,
    correct,
    total,
    targetScore: Math.min(100, finalPct + 12),
    subjectScores,
    weaknesses
  };
}

function saveEssayResponses(responses, studentId, examName) {
  const blueprint = getExamBlueprint();
  const db = getDb();
  const examLog = db.prepare("SELECT id FROM exam_logs WHERE student_id = ? AND name = ? ORDER BY id DESC LIMIT 1").get(studentId, examName);
  const insert = db.prepare(`INSERT INTO essay_responses (student_id, exam_log_id, exam_name, question_index, response, rubric, points, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`);
  blueprint.forEach((section, sectionIndex) => (section.questions || []).forEach((question, questionIndex) => {
    if (question.type !== "paragraph" && question.type !== "essay") return;
    const response = String(responses?.[sectionIndex]?.[questionIndex] || "");
    const row = insert.run(studentId, examLog?.id || null, examName, questionIndex, response, question.rubric || "", Math.max(1, Number(question.points || 1)));
    scoreEssay({ response, rubric: question.rubric, points: question.points || 1 }).then((scored) => {
      if (scored.status === "ai_graded") db.prepare("UPDATE essay_responses SET ai_score = ?, status = 'ai_graded' WHERE id = ?").run(scored.score, row.lastInsertRowid);
    }).catch(() => {});
  }));
}

function getSubjectColor(score) {
  if (score >= 90) return "emerald";
  if (score >= 80) return "blue";
  if (score >= 70) return "amber";
  return "rose";
}

module.exports = { getExamBlueprint, scoreExamAttempt, saveEssayResponses };
