const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_PROMPT_DRILL_TOKENS = 110000;

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

function takeDrillsWithinTokenBudget(drills, tokenBudget) {
  let usedTokens = 0;
  const included = [];

  for (const drill of drills) {
    const estimatedTokens = Math.ceil(JSON.stringify(drill).length / 4);
    if (usedTokens + estimatedTokens > tokenBudget) break;
    included.push(drill);
    usedTokens += estimatedTokens;
  }

  return included;
}

// This prompt is deliberately verbose and example-driven rather than a
// single instruction line. Structured-output models like this one follow
// concrete patterns far more reliably than abstract adjectives ("be
// friendly"), so every rule below is paired with a labeled GOOD/BAD example
// the model can pattern-match against. The **word** convention is a real
// contract with the frontend: RichText (DiagnosticVisuals.jsx) parses
// double-asterisks into <strong> tags, so bolding is not decorative here —
// it drives what actually gets visually emphasized on screen.
//
// SCOPE: this prompt speaks about ONE just-finished exam attempt.
const DIAGNOSTIC_SYSTEM_PROMPT = `You are an experienced, warm but direct academic coach reviewing one student's practice exam, one-on-one, right after they finished it. You are not a report generator — you are the coach they're sitting across from.

Return ONLY a strict JSON object with exactly these keys: headline, performance_summary, subject_mastery, study_plan, encouragement.

=== FIELD-BY-FIELD RULES ===

1. headline (string, 8-14 words)
The single most important takeaway from this attempt, in your own coaching voice — not a restatement of the percentage score. Wrap the ONE most important word or short phrase in **double asterisks** for emphasis.
GOOD: "You're ready on fundamentals — **pacing** is what's costing you points right now."
BAD: "Your score is 72%, which is passing but not excellent." (this is a restated number, not a takeaway)

2. performance_summary (string, 2-3 sentences)
Zoom out on this attempt in plain language. Reference the strongest and weakest subject by name. Bold at most 2 short phrases total across the whole field.
GOOD: "You cleared **three out of four** subjects comfortably, and Reading Comprehension is clearly your anchor. Math is the outlier — the gap there is big enough that it's quietly pulling your average down."
BAD: "The diagnostic summary indicates variable performance metrics across subject clusters." (jargon, no voice)

3. subject_mastery (array, one entry per subject given in subjectBreakdown, same order)
Each entry: { subject, mastery_percentage, observed_issue, action_tip }
- mastery_percentage: copy the given score number exactly, unchanged.
- observed_issue (one sentence, 8-16 words, second person "you"): what's actually happening for THIS student in THIS subject, grounded in their score and, if given, their recentMistakes for that subject. Bold at most one key phrase.
  GOOD (low score): "You're **rushing** the inference questions instead of rereading the passage first."
  GOOD (high score, 80+): "Your **error-checking** habit is exactly why this subject stays consistent."
  BAD: "Lack of Understanding and Incorrect Answer Selection" (label, not a sentence — never do this)
- action_tip (one sentence, imperative, 6-12 words): a single concrete next action, not generic advice.
  GOOD: "Try timing yourself at 90 seconds per inference question this week."
  BAD: "Study harder and review your notes." (too generic to be useful)
Vary sentence structure and vocabulary across subjects in the array — do not reuse the same template twice.

4. study_plan (array, 2-4 items, ordered by priority — most urgent first)
Each entry: { title, description }
- title: 2-5 words, action-oriented, no punctuation at the end. e.g. "Rebuild Math Fundamentals"
- description: one sentence (10-20 words) explaining what to actually do and why it's next in priority.
Base the plan on the real weak points in subjectBreakdown/recentMistakes — do not include a subject that scored 85+ unless every subject did.

5. encouragement (string, one sentence, 8-16 words)
A genuine, specific closing line — grounded in something real from this attempt, not generic cheerleading.
GOOD: "That Reading Comprehension score shows you already know how to grind — bring that here."
BAD: "You can do it! Believe in yourself and never give up!" (empty hype, avoid entirely)

=== GLOBAL RULES ===
- 100% English.
- Never use software/data jargon: "timestamp," "data log," "clustering," "input stream," "diagnostic weighting," "fallback."
- Never output a label, noun phrase, or Title Case fragment anywhere — every field is a real spoken sentence.
- Do not repeat the same sentence opener ("You are...", "This subject...") across multiple subject_mastery entries.
- Total **bold** usage across the entire response: roughly 4-8 instances. Do not bold entire sentences.`;

// SCOPE: this prompt speaks about the student's PATTERN ACROSS MULTIPLE
// attempts — it's the same coach, just looking at the history instead of
// a single fresh exam. Keep the voice identical to DIAGNOSTIC_SYSTEM_PROMPT
// above; only the lens (one attempt vs. a trend) is different. This prompt
// used to describe an entirely separate "strategic learning router"
// persona, which is why the adaptive-gate banner used to read cold next to
// the post-exam diagnostic — that mismatch is exactly what this rewrite
// fixes.
const ADAPTIVE_GATE_SYSTEM_PROMPT = `You are the same warm, direct academic coach from the exam diagnostic — now looking at a student's history across several attempts to decide what they should drill next. You're talking directly to the student, not writing an internal report.

Return ONLY a strict JSON object with exactly these keys: focus_subject, confidence, rationale, drill_subject_order, recommended_drill_filters, reviewer_focus_tags, exam_focus_tags.

- focus_subject (string): the single subject name to prioritize next.
- confidence (number, 0-1): how clear-cut this call is given the data. Low weak-subject signal or very few attempts should mean lower confidence.
- rationale (string, 2-3 sentences, second person "you"): tell the student plainly why this subject is next, referencing their actual pattern ACROSS ATTEMPTS — not just one exam. Bold at most 2 short phrases with **double asterisks**.
  GOOD: "Math keeps showing up as your softest spot across your last few attempts — that repetition is why it's next, not a random pick. Clearing it now will do more for your average than polishing a subject you've already got **locked in**."
  BAD: "Your active review track has been programmatically updated based on cumulative tracking metrics." (jargon, not a sentence a coach would say)
  BAD: "This exam shows a weakness in Math." (wrong lens — this is about the trend across attempts, not a single exam)
- drill_subject_order (array of strings): subjects ordered by priority, most urgent first.
- recommended_drill_filters (array of 1-5 objects): select the weakness areas that will build the student's complete related-practice pool. Each object is { subject, subCategory, weaknessTag }; use exact values from availableDrills and use an empty string for a lower-level field when the whole broader area is relevant. For example, { "subject": "Mathematics", "subCategory": "Functions", "weaknessTag": "" } includes every Functions drill, while { "subject": "Mathematics", "subCategory": "", "weaknessTag": "" } includes all Mathematics drills. Evaluate semantic relevance across the full catalog yourself; it has not been pre-filtered. Do not select only a small sample of question IDs.
- reviewer_focus_tags (array of strings): short topic labels, not full sentences.
- exam_focus_tags (array of strings): short topic labels, not full sentences.

=== GLOBAL RULES ===
- 100% English, every sentence a real spoken sentence — never a label or Title Case fragment.
- Never use: "programmatically," "cumulative tracking metrics," "systemic coverage," "data loops," "analytical precision," "velocity," "weak signals," "system exceptions," "time fallbacks," or similar system-speak.
- Do not repeat the same opening phrase you've used in a prior response.
- Do not be overly dramatic or inflate encouragement unnaturally — stay constructive and direct.`;

async function diagnoseExam(payload) {
  const fallback = buildFallbackDiagnostic(payload);

  try {
    // OPTIMIZATION FILTER START 
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
          .slice(0, 8) // Limit to preserve daily token capacities, but give the model enough real signal to spot a pattern
          .map(log => ({
            subject: log.subject || log.title || log.category || "General Context",
            missedTopic: log.topic || log.category || log.skill || null
          }))
      : [];
    // OPTIMIZATION FILTER END 

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.4, // Slightly higher than pure-analysis tasks — this output needs to read like a person, not a report
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: DIAGNOSTIC_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Coach this specific student based on the data below. Every field must be grounded in the actual numbers and missed topics given — do not invent details that aren't implied by the data.",
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

async function buildAdaptiveGate(payload) {
  const fallback = buildFallbackGate(payload);

  try {
    // The client sends label-only drill metadata under its token budget. Keep
    // an independent server budget so malformed payloads cannot inflate cost.
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
    const receivedDrills = Array.isArray(payload?.contentPools?.drills)
      ? payload.contentPools.drills
          .filter((drill) => drill && drill.id)
          .map((drill) => ({
            id: String(drill.id),
            title: String(drill.title || "Untitled drill"),
            subject: String(drill.subject || "General Practice"),
            subCategory: String(drill.subCategory || ""),
            weaknessTag: String(drill.weaknessTag || "")
          }))
      : [];
    const availableDrills = takeDrillsWithinTokenBudget(receivedDrills, MAX_PROMPT_DRILL_TOKENS);
    if (availableDrills.length < receivedDrills.length) {
      console.warn(`Adaptive gate truncated drill catalog from ${receivedDrills.length} to ${availableDrills.length} entries to stay within the ${MAX_PROMPT_DRILL_TOKENS}-token budget.`);
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: ADAPTIVE_GATE_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Tell this student, in your own coaching voice, which subject to drill next based on their pattern across the attempts below — not just one exam. Ground every field in the actual data given.",
            studentHistorySummary: cleanHistory,
            availableDrills,
            instruction: "Review the complete availableDrills catalog before choosing recommended_drill_filters. The catalog was not pre-filtered for this student, so determine the relevant practice areas yourself using exact catalog labels."
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

// Natural-language, varied phrasing for when Groq is unreachable and we have
// no AI-generated text to fall back on. Picks a template deterministically
// per subject (based on name + score band) so two subjects in the same
// score range don't read as copy-pasted. Uses the same **bold** convention
// as the AI path so RichText (DiagnosticVisuals.jsx) renders both sources
// identically.
function naturalFallbackIssue(subjectName, pct) {
  const seed = String(subjectName || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  if (pct >= 85) {
    const strong = [
      `You're **consistently solid** in ${subjectName} — keep this pace up.`,
      `${subjectName} is clearly a strength right now; this is where you're **scoring your points**.`,
      `**Strong, dependable** performance in ${subjectName}. Nothing urgent to fix here.`
    ];
    return strong[seed % strong.length];
  }
  if (pct >= 75) {
    const decent = [
      `You're doing fine in ${subjectName}, with room to **tighten up the details**.`,
      `${subjectName} is in good shape — a little more practice will make it **consistent**.`,
      `Solid grasp of ${subjectName} overall, just watch out for **careless slips**.`
    ];
    return decent[seed % decent.length];
  }
  if (pct >= 60) {
    const shaky = [
      `${subjectName} needs more focused review — the **fundamentals** aren't fully locked in yet.`,
      `You're getting some ${subjectName} items right, but the pattern suggests **gaps in the basics**.`,
      `A closer look at your core ${subjectName} concepts will help this score **move up**.`
    ];
    return shaky[seed % shaky.length];
  }
  const weak = [
    `${subjectName} is your **biggest opportunity** right now — start review here.`,
    `This is the subject to prioritize: ${subjectName} needs rebuilding from the **fundamentals up**.`,
    `Your ${subjectName} results point to a **core concept gap** worth addressing first.`
  ];
  return weak[seed % weak.length];
}

function naturalFallbackActionTip(subjectName, pct) {
  const seed = String(subjectName || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + 1;

  if (pct >= 85) {
    const strong = [
      `Keep ${subjectName} in rotation so the streak holds.`,
      `Do one light ${subjectName} review a week to maintain it.`,
      `Use your ${subjectName} routine as a model for weaker subjects.`
    ];
    return strong[seed % strong.length];
  }
  if (pct >= 60) {
    const shaky = [
      `Redo your missed ${subjectName} items and note the pattern.`,
      `Spend one focused session on ${subjectName} fundamentals this week.`,
      `Time yourself on ${subjectName} drills to build consistency.`
    ];
    return shaky[seed % shaky.length];
  }
  const weak = [
    `Start ${subjectName} review from the basics before attempting drills.`,
    `Block dedicated time for ${subjectName} before your next attempt.`,
    `Rebuild ${subjectName} fundamentals first, then retest this subject.`
  ];
  return weak[seed % weak.length];
}

function buildFallbackDiagnostic(payload = {}) {
  const breakdown = Array.isArray(payload.subjectBreakdown) ? payload.subjectBreakdown : [];
  const normalizedSubjects = breakdown.map((subject) => ({
    subject: subject.title || subject.subject || subject.name || "Untitled Subject",
    mastery_percentage: Number(subject.pct ?? subject.mastery_percentage ?? subject.mastery ?? 0)
  }));

  const sorted = [...normalizedSubjects].sort((a, b) => a.mastery_percentage - b.mastery_percentage);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  const headline = weakest && strongest && weakest.subject !== strongest.subject
    ? `**${strongest.subject}** is carrying you — ${weakest.subject} is where the next gains are.`
    : weakest
      ? `Focus this cycle on **${weakest.subject}** to move your average up.`
      : "Complete a few more attempts so we can pinpoint your next focus area.";

  const performanceSummary = weakest && strongest && weakest.subject !== strongest.subject
    ? `You're solid in **${strongest.subject}** at ${strongest.mastery_percentage}%, while ${weakest.subject} sits at ${weakest.mastery_percentage}%. That gap is the fastest lever you have to raise your overall score.`
    : "Your practice attempt has been logged. A couple more attempts across your subjects will help sharpen this feedback.";

  const subjectMastery = normalizedSubjects.map(({ subject, mastery_percentage }) => ({
    subject,
    mastery_percentage,
    observed_issue: naturalFallbackIssue(subject, mastery_percentage),
    action_tip: naturalFallbackActionTip(subject, mastery_percentage)
  }));

  const allStrong = normalizedSubjects.every((s) => s.mastery_percentage >= 85);
  const priorityOrder = (allStrong ? normalizedSubjects : normalizedSubjects.filter((s) => s.mastery_percentage < 85))
    .sort((a, b) => a.mastery_percentage - b.mastery_percentage)
    .slice(0, 3);
  const studyPlan = priorityOrder.length
    ? priorityOrder.map((s, i) => ({
        title: i === 0 ? `Rebuild ${s.subject}` : `Reinforce ${s.subject}`,
        description: i === 0
          ? `Start here — ${s.subject} is currently your lowest scoring subject at ${s.mastery_percentage}%.`
          : `Next, tighten up ${s.subject} to lock in a more consistent ${s.mastery_percentage}%+ baseline.`
      }))
    : [{ title: "Attempt Another Set", description: "Complete another practice set so we can build a study plan around real data." }];

  const encouragement = strongest
    ? `Your ${strongest.subject} score shows you already know how to perform under pressure.`
    : "Every attempt from here gives you sharper, more specific feedback.";

  return {
    headline,
    performance_summary: performanceSummary,
    subject_mastery: subjectMastery,
    study_plan: studyPlan,
    encouragement,
    source: "local_fallback"
  };
}

// This is the offline stand-in for buildAdaptiveGate's rationale — it needs
// to sound like the SAME coach as naturalFallbackIssue/buildFallbackDiagnostic
// above, just talking about the trend across attempts instead of one exam.
// This used to read like a system log ("programmatically updated...
// cumulative tracking metrics"); that's what made the banner feel cold even
// when Groq was reachable, since a slow/failed call falls straight through
// to this text.
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
  const availableDrills = Array.isArray(payload?.contentPools?.drills) ? payload.contentPools.drills : [];

  const analyticalFallbackRationale = weakCounts.size
    ? `**${focusSubject}** keeps showing up as your softest spot across your recent attempts, so that's where the next block of practice will help most. Clearing this now gives you the biggest lift to your overall score before your next mock exam.`
    : "Your scores are holding **steady** across subjects right now — nothing is dragging you down, so keep practicing broadly until a clear gap shows up.";

  return {
    focus_subject: focusSubject,
    confidence: weakCounts.size ? 0.72 : 0.35,
    rationale: analyticalFallbackRationale,
    drill_subject_order: [focusSubject],
    recommended_drill_filters: [{ subject: focusSubject, subCategory: "", weaknessTag: "" }],
    available_drills: availableDrills,
    reviewer_focus_tags: [focusSubject],
    exam_focus_tags: [focusSubject],
    source: "local_fallback"
  };
}

function normalizeDiagnostic(value, fallback) {
  const subjectMastery = Array.isArray(value.subject_mastery) && value.subject_mastery.length
    ? value.subject_mastery.map((entry, i) => ({
        subject: entry.subject || fallback.subject_mastery[i]?.subject || `Subject ${i + 1}`,
        mastery_percentage: Number(entry.mastery_percentage ?? fallback.subject_mastery[i]?.mastery_percentage ?? 0),
        observed_issue: entry.observed_issue || fallback.subject_mastery[i]?.observed_issue || "",
        action_tip: entry.action_tip || fallback.subject_mastery[i]?.action_tip || ""
      }))
    : fallback.subject_mastery;

  const studyPlan = Array.isArray(value.study_plan) && value.study_plan.length
    ? value.study_plan
        .filter((step) => step && (step.title || step.description))
        .map((step, i) => ({
          title: step.title || `Step ${i + 1}`,
          description: step.description || ""
        }))
    : fallback.study_plan;

  return {
    headline: value.headline || fallback.headline,
    performance_summary: value.performance_summary || fallback.performance_summary,
    subject_mastery: subjectMastery,
    study_plan: studyPlan.length ? studyPlan : fallback.study_plan,
    encouragement: value.encouragement || fallback.encouragement,
    source: "groq"
  };
}

function normalizeGate(value, fallback) {
  const catalog = Array.isArray(fallback.available_drills) ? fallback.available_drills : [];
  const recommendedDrillFilters = normalizeDrillFilters(value.recommended_drill_filters, catalog, fallback.recommended_drill_filters);
  return {
    focus_subject: value.focus_subject || fallback.focus_subject,
    confidence: Number(value.confidence ?? fallback.confidence),
    rationale: value.rationale || fallback.rationale,
    drill_subject_order: Array.isArray(value.drill_subject_order) ? value.drill_subject_order : fallback.drill_subject_order,
    recommended_drill_filters: recommendedDrillFilters,
    reviewer_focus_tags: Array.isArray(value.reviewer_focus_tags) ? value.reviewer_focus_tags : fallback.reviewer_focus_tags,
    exam_focus_tags: Array.isArray(value.exam_focus_tags) ? value.exam_focus_tags : fallback.exam_focus_tags,
    source: "groq"
  };
}

function normalizeDrillFilters(filters, catalog, fallback) {
  if (!Array.isArray(filters)) return fallback || [];
  const exactValue = (value, field) => {
    const requested = String(value || "").trim().toLowerCase();
    if (!requested) return "";
    return catalog.find((drill) => String(drill[field] || "").trim().toLowerCase() === requested)?.[field] || "";
  };

  const normalized = filters
    .slice(0, 5)
    .map((filter) => {
      const subject = exactValue(filter?.subject, "subject");
      const subCategory = exactValue(filter?.subCategory, "subCategory");
      const weaknessTag = exactValue(filter?.weaknessTag, "weaknessTag");
      if (!subject) return null;
      return { subject, subCategory, weaknessTag };
    })
    .filter(Boolean)
    .filter((filter) => catalog.some((drill) => (
      drill.subject === filter.subject
      && (!filter.subCategory || drill.subCategory === filter.subCategory)
      && (!filter.weaknessTag || drill.weaknessTag === filter.weaknessTag)
    )));
  return normalized.length ? normalized : (fallback || []);
}

async function scoreEssay({ response, rubric, points }) {
  const maxPoints = Math.max(1, Number(points || 1));
  const submission = String(response || "").trim();
  if (!submission) {
    return { score: 0, rationale: "No written response was submitted.", status: "ai_graded", source: "local_validation" };
  }

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a careful academic essay evaluator. Return ONLY JSON with exactly two keys: score (number) and rationale (string). Score only against the provided rubric, from 0 to the stated maximum. The rationale must be 2-4 concise sentences explaining the awarded score, naming at least one strength and one specific improvement where applicable. Do not claim the response says something it does not say."
        },
        {
          role: "user",
          content: JSON.stringify({ rubric: String(rubric || "Assess clarity, reasoning, evidence, organization, and relevance."), maxPoints, response: submission })
        }
      ]
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const value = JSON.parse(raw);
    const score = Number(value.score);
    if (!Number.isFinite(score)) throw new Error("Groq returned no numeric essay score.");
    const rationale = String(value.rationale || "").trim();
    if (!rationale) throw new Error("Groq returned no essay rationale.");
    return { score: Math.max(0, Math.min(maxPoints, score)), rationale, status: "ai_graded", source: "groq" };
  } catch (error) {
    console.error("Groq essay grading fallback:", error.message);
    return { score: null, rationale: "Automatic essay grading is temporarily unavailable. This response remains pending administrator review.", status: "pending_review", source: "unavailable", warning: error.message };
  }
}

module.exports = { diagnoseExam, buildAdaptiveGate, scoreEssay };
