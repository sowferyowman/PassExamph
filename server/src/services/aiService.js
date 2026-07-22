const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ESSAY_FALLBACK_MODEL = "llama-3.1-8b-instant";

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  // Lazy-load so the rest of the API can still run when the SDK is not installed yet.
  let GroqModule;
  try {
    GroqModule = require("@groq/groq-sdk");
  } catch (_error) {
    GroqModule = require("groq-sdk");
  }
  const Groq = GroqModule.default || GroqModule;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function diagnoseExam(payload) {
  const fallback = buildFallbackDiagnostic(payload);

  try {
    // --- OPTIMIZATION FILTER START ---
    // Extract only the necessary diagnostic summaries to cut down payload size and prevent 429 tokens limit errors.
    const cleanBreakdown = Array.isArray(payload?.subjectBreakdown) 
      ? payload.subjectBreakdown.map(s => ({
          subject: s.title || s.subject || s.name || "Unknown",
          score: Number(s.pct ?? s.mastery_percentage ?? 0)
        }))
      : [];

    const cleanRecentMistakes = Array.isArray(payload?.fallbackLogs)
      ? payload.fallbackLogs
          .filter(log => log && log.isCorrect === false)
          .slice(0, 5) // Limit to top 5 logs to heavily preserve daily token capacities
          .map(log => ({ category: log.category || "General Context", issue: "Incorrect Answer Selection" }))
      : [];
    // --- OPTIMIZATION FILTER END ---

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.35, // Balanced structure for sharp, analytical reasoning
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a professional, objective, and insightful AI Academic Advisor for college entrance exam preparation. Return only strict JSON with keys: percentage_score, subject_mastery, weakness_paragraph. subject_mastery must be an array of { subject, mastery_percentage, observed_issue }. CRITICAL FORMATTING RULES: 1. Write 100% in English. 2. 'weakness_paragraph' must be a solid, detailed 3-4 sentence analytical review. Avoid over-the-top motivational language, dramatic cheerleading, or emotional hyperbole. Speak like a calm, sharp academic mentor—identify precisely where the structural concept gap lies based on the metrics, explain how that vulnerability impacts their testing pacing or score yields, and supply a clear, strategic study directive to address it. 3. STRICTLY AVOID technical software or data jargon such as 'timestamp fallbacks', 'data logs', 'clustering signals', 'input streams', or 'diagnostic weightings'."
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Provide a grounded, professional, and strategic diagnostic paragraph using the student performance summary data.",
            studentSummary: {
              percentageScore: payload?.percentageScore || 0,
              rawScore: payload?.rawScore || 0,
              totalItems: payload?.totalItems || 0,
              subjectBreakdown: cleanBreakdown,
              recentMistakes: cleanRecentMistakes
            }
          })
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    return normalizeDiagnostic(JSON.parse(raw), fallback);
  } catch (error) {
    console.error("Groq exam diagnosis fallback:", error.message);
    return { ...fallback, source: "local_fallback", warning: error.message };
  }
}

async function scoreEssay({ response = "", rubric = "", points = 1 } = {}) {
  const groq = getGroqClient();
  const messages = [
    { role: "system", content: "Score the essay using the rubric. Return only JSON: {\"score\": number}. No feedback or explanation. Score must be between 0 and the supplied maximum points." },
    { role: "user", content: JSON.stringify({ response, rubric: rubric || "Assess relevance, accuracy, organization, and clarity.", max_points: Number(points) || 1 }) }
  ];
  const request = (model) => groq.chat.completions.create({ model, temperature: 0.1, max_tokens: 200, response_format: { type: "json_object" }, messages });
  const normalizeScore = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(Number(points) || 1, numeric)) : null;
  };
  try {
    const completion = await request(GROQ_MODEL);
    const value = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    const score = normalizeScore(value.score);
    return score === null ? { score: null, status: "pending_review" } : { score, status: "ai_graded" };
  } catch (error) {
    if (error?.status === 429 || error?.response?.status === 429 || /429|rate limit/i.test(error?.message || "")) {
      return { score: null, status: "pending_review", reason: "rate_limited" };
    }
    try {
      const completion = await request(GROQ_ESSAY_FALLBACK_MODEL);
      const value = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
      const score = normalizeScore(value.score);
      return score === null ? { score: null, status: "pending_review" } : { score, status: "ai_graded" };
    } catch (fallbackError) {
      return { score: null, status: "pending_review", reason: fallbackError?.message || error?.message };
    }
  }
}

async function buildAdaptiveGate(payload) {
  const fallback = buildFallbackGate(payload);

  try {
    // --- OPTIMIZATION FILTER START ---
    // Extract past metadata attempts to dramatically condense historical analytics arrays sent to the API.
    const cleanHistory = Array.isArray(payload?.diagnosticHistory)
      ? payload.diagnosticHistory.slice(-3).map(attempt => {
          const subjectMastery = attempt.aiDiagnostic?.subject_mastery || attempt.subjectScores || [];
          return {
            score: attempt.percentageScore || attempt.score || 0,
            lowPerformances: subjectMastery
              .filter(s => Number(s.mastery_percentage ?? s.pct ?? 0) < 75)
              .map(s => s.subject || s.title || "Unknown Topic")
          };
        })
      : [];
    // --- OPTIMIZATION FILTER END ---

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strategic learning router helping high school students systematically organize their entrance exam preparation. Return only JSON with keys: focus_subject, confidence, rationale, drill_subject_order, reviewer_focus_tags, exam_focus_tags. CRITICAL FORMATTING RULES: 1. Write 100% in English. 2. 'rationale' must be a substantial, grounded 3-4 sentence strategic explanation. Do not be overly dramatic, patronizing, or inflate encouragement unnaturally. Keep your analysis constructive and direct: state clearly why this particular subject path is the most logical next step based on cumulative practice data, and how tackling its subset topics systematically will optimize their overall competitive scoring edge. 3. NEVER use developer or engineering keywords such as 'weak signals', 'system exceptions', 'time fallbacks', 'data loops', or 'vulnerabilities'."
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Formulate an objective, well-rounded, and paragraph-long priority study roadmap text based on the provided tracking history metrics.",
            studentHistorySummary: cleanHistory
          })
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    return normalizeGate(JSON.parse(raw), fallback);
  } catch (error) {
    console.error("Groq adaptive gate fallback:", error.message);
    return { ...fallback, source: "local_fallback", warning: error.message };
  }
}

function buildFallbackDiagnostic(payload = {}) {
  const rawScore = Number(payload.rawScore || payload.correct || 0);
  const totalItems = Number(payload.totalItems || payload.total || 0);
  const percentage = Number(payload.percentageScore ?? (totalItems ? Math.round((rawScore / totalItems) * 100) : 0));
  const breakdown = Array.isArray(payload.subjectBreakdown) ? payload.subjectBreakdown : [];
  const weakSubject = [...breakdown].sort((a, b) => Number(a.pct ?? a.mastery_percentage ?? 0) - Number(b.pct ?? b.mastery_percentage ?? 0))[0];
  const weakSubjectName = weakSubject ? (weakSubject.title || weakSubject.subject || weakSubject.name) : "";

  const analyticalFallbackParagraph = weakSubjectName
    ? `A review of your latest performance breakdown indicates a distinct conceptual drop within the ${weakSubjectName} segment. Misinterpreting core principles in this area frequently leads to compound pacing errors and lower score yields under strict testing conditions. Isolating these exact problematic units right now is the most effective way to protect your overall average before the official exam. The custom practice drills compiled below are structurally mapped to help you build a far more stable baseline in this track.`
    : "Your practice attempt has been logged successfully. To isolate specific conceptual core gaps and deliver a highly targeted baseline strategy, please complete additional diagnostic tracking sets across your remaining core reviewer tracks.";

  return {
    percentage_score: percentage,
    subject_mastery: breakdown.map((subject) => ({
      subject: subject.title || subject.subject || subject.name || "Untitled Subject",
      mastery_percentage: Number(subject.pct ?? subject.mastery_percentage ?? subject.mastery ?? 0),
      observed_issue: Number(subject.pct ?? subject.mastery_percentage ?? subject.mastery ?? 0) < 75 ? "Requires targeted core review" : "Demonstrating stable proficiency"
    })),
    weakness_paragraph: analyticalFallbackParagraph,
    source: "local_fallback"
  };
}

function buildFallbackGate(payload = {}) {
  const diagnostics = Array.isArray(payload.diagnosticHistory) ? payload.diagnosticHistory : [];
  const weakCounts = new Map();

  diagnostics.forEach((attempt) => {
    const subjectMastery = attempt.aiDiagnostic?.subject_mastery || attempt.subjectScores || [];
    subjectMastery.forEach((subject) => {
      const name = subject.subject || subject.title || subject.name;
      const pct = Number(subject.mastery_percentage ?? subject.pct ?? subject.mastery ?? 0);
      if (name && pct < 75) weakCounts.set(name, (weakCounts.get(name) || 0) + 1);
    });
    (attempt.itemDiagnostics || []).forEach((item) => {
      if (item.isCorrect === false && item.category) weakCounts.set(item.category, (weakCounts.get(item.category) || 0) + 1);
    });
  });

  const focusSubject = [...weakCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "General Comprehensive Review";

  const analyticalFallbackRationale = weakCounts.size
    ? `Your active review track has been programmatically updated to establish ${focusSubject} as your primary focus area. Based on cumulative tracking metrics, allocating dedicated revision blocks to this subject offers the highest logical leverage to optimize your composite average. Addressing these foundational problem areas early ensures you build necessary velocity and analytical precision well ahead of your testing date.`
    : "Your current subject competencies show an even, stable distribution across active branches. Your path will remain balanced and comprehensive for now, allowing you to maintain systemic coverage across all core competencies until a specific target area emerges.";

  return {
    focus_subject: focusSubject,
    confidence: weakCounts.size ? 0.72 : 0.35,
    rationale: analyticalFallbackRationale,
    drill_subject_order: [focusSubject],
    reviewer_focus_tags: [focusSubject],
    exam_focus_tags: [focusSubject],
    source: "local_fallback"
  };
}

function normalizeDiagnostic(value, fallback) {
  return {
    percentage_score: Number(value.percentage_score ?? fallback.percentage_score),
    subject_mastery: Array.isArray(value.subject_mastery) ? value.subject_mastery : fallback.subject_mastery,
    weakness_paragraph: value.weakness_paragraph || fallback.weakness_paragraph,
    source: "groq"
  };
}

function normalizeGate(value, fallback) {
  return {
    focus_subject: value.focus_subject || fallback.focus_subject,
    confidence: Number(value.confidence ?? fallback.confidence),
    rationale: value.rationale || fallback.rationale,
    drill_subject_order: Array.isArray(value.drill_subject_order) ? value.drill_subject_order : fallback.drill_subject_order,
    reviewer_focus_tags: Array.isArray(value.reviewer_focus_tags) ? value.reviewer_focus_tags : fallback.reviewer_focus_tags,
    exam_focus_tags: Array.isArray(value.exam_focus_tags) ? value.exam_focus_tags : fallback.exam_focus_tags,
    source: "groq"
  };
}

module.exports = { diagnoseExam, buildAdaptiveGate, scoreEssay };
