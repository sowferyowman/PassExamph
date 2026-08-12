const { pool } = require("../config/database.pg");
const { scoreEssay } = require("./aiService");

async function getExamBlueprint() {
  const result = await pool.query("SELECT payload FROM exam_blueprint WHERE id = 1");
  const row = result.rows[0];
  return typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
}

async function scoreExamAttempt(responses, studentId = 1) {
  const blueprint = await getExamBlueprint();
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

  const calculatedPct = total ? Math.round((correct / total) * 100) : 0;
  const hasEssays = blueprint.some((section) => (section.questions || []).some((question) => question.type === "paragraph" || question.type === "essay"));
  // The database requires a numeric placeholder, but no provisional score is
  // returned to the student while an essay is awaiting review.
  const finalPct = hasEssays ? null : calculatedPct;
  
  try {
    const attemptCount = Number((await pool.query("SELECT COUNT(*) AS total FROM exam_logs WHERE student_id = $1", [studentId])).rows[0].total);
    
    const currentDate = new Date().toISOString().split("T")[0];
    const examName = `ACET Mock Practice #${attemptCount + 1}`;
    
    await pool.query(`
      INSERT INTO exam_logs (student_id, name, taken_at, score, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [studentId, examName, currentDate, finalPct ?? 0, hasEssays ? "Pending Review" : "Analyzed"]);

    // Essay-backed attempts are incomplete until their responses are reviewed.
    // Do not plot their MCQ-only subtotal as a completed progression score.
    if (!hasEssays) {
      await pool.query("INSERT INTO progression (student_id, label, score) VALUES ($1, $2, $3)", [studentId, `Mock ${attemptCount + 1}`, finalPct]);
    }

    if (!hasEssays) for (const subject of subjectScores) {
      await pool.query(`
        INSERT INTO subjects (student_id, name, mastery, color)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(student_id, name) DO UPDATE SET mastery = excluded.mastery
      `, [studentId, subject.title, subject.pct, getSubjectColor(subject.pct)]);
    }

    await saveEssayResponses(responses, studentId, examName);
  } catch (error) {
    console.error("Failed to write exam log record to database:", error);
  }

  const weaknesses = hasEssays ? [] : subjectScores
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
    targetScore: hasEssays ? null : Math.min(100, finalPct + 12),
    subjectScores,
    weaknesses,
    hasEssays,
    status: hasEssays ? "Pending Review" : "Analyzed"
  };
}

async function saveEssayResponses(responses, studentId, examName) {
  const blueprint = await getExamBlueprint();
  const examLog = (await pool.query("SELECT id FROM exam_logs WHERE student_id = $1 AND name = $2 ORDER BY id DESC LIMIT 1", [studentId, examName])).rows[0];
  for (const [sectionIndex, section] of blueprint.entries()) {
    for (const [questionIndex, question] of (section.questions || []).entries()) {
      if (question.type !== "paragraph" && question.type !== "essay") continue;
      const response = String(responses?.[sectionIndex]?.[questionIndex] || "");
      const row = (await pool.query(
        `INSERT INTO essay_responses (student_id, exam_log_id, exam_name, question_index, response, rubric, points, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_review')
        RETURNING id`,
        [studentId, examLog?.id || null, examName, questionIndex, response, question.rubric || "", Math.max(1, Number(question.points || 1))]
      )).rows[0];
      scoreEssay({ response, rubric: question.rubric, points: question.points || 1 }).then((scored) => {
        if (scored.status === "ai_graded") pool.query("UPDATE essay_responses SET ai_score = $1, ai_rationale = $2, status = 'ai_graded' WHERE id = $3", [scored.score, scored.rationale, row.id]);
      }).catch(() => {});
    }
  }
}

function getSubjectColor(score) {
  if (score >= 90) return "emerald";
  if (score >= 80) return "blue";
  if (score >= 70) return "amber";
  return "rose";
}

module.exports = { getExamBlueprint, scoreExamAttempt, saveEssayResponses };
