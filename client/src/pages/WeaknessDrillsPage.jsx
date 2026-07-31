import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaRedo, FaSpinner } from "react-icons/fa";
import { routeAdaptiveLearning } from "../api/aiApi";
import { loadDrillSessions, saveDrillSessionToApi } from "../api/drillApi";
import {
  getCurrentUser,
  getDrillBankQuestions,
  getExamBlueprints,
  getQuestionsForSubject,
  getReviewerBlueprints,
  getStudentDashboard,
  getDrillSessions,
  getWeaknessAnalysis,
  saveDrillSession,
  scoreDrillAttempt
} from "../services/storage";

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      :root {
        --wd-bg: #ffffff;
        --wd-surface: #fafafa;
        --wd-border: #e5e7eb;
        --wd-text: #111827;
        --wd-text-muted: #6b7280;
        --wd-accent: #2563eb;
        --wd-accent-soft: #eff4ff;
        --wd-success: #059669;
        --wd-success-soft: #ecfdf5;
      }

      .card { background: var(--wd-bg); border: 1px solid var(--wd-border); border-radius: 10px; }
      .progress-track { background: var(--wd-border); border-radius: 999px; overflow: hidden; }
      .progress-fill { background: var(--wd-accent); border-radius: 999px; transition: width 0.4s ease; }

      .btn-primary {
        background: var(--wd-accent);
        color: #fff;
        border-radius: 8px;
        transition: background 0.15s ease;
      }
      .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
      .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

      .btn-secondary {
        background: transparent;
        border: 1px solid var(--wd-border);
        color: var(--wd-text);
        border-radius: 8px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .btn-secondary:hover { border-color: #d1d5db; background: var(--wd-surface); }

      .option-row {
        border: 1px solid var(--wd-border);
        border-radius: 8px;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .option-row:hover:not(.is-disabled) { border-color: #d1d5db; }
      .option-row.is-selected { border-color: var(--wd-accent); background: var(--wd-accent-soft); }

      .focus-ring:focus-visible { outline: 2px solid var(--wd-accent); outline-offset: 2px; }

      @media (prefers-reduced-motion: reduce) {
        .progress-fill { transition: none; }
      }
    `}</style>
  );
}

export default function WeaknessDrillsPage() {
  const location = useLocation();
  const user = getCurrentUser();
  const analysis = useMemo(() => getWeaknessAnalysis(user?.email), [user?.email]);
  const dashboard = useMemo(() => getStudentDashboard(user?.email), [user?.email]);
  const [adaptiveGate, setAdaptiveGate] = useState(null);
  const [gateStatus, setGateStatus] = useState("idle");
  const [activeSubject, setActiveSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [results, setResults] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sessions, setSessions] = useState(() => getDrillSessions(user?.email));
  const routedDrillStarted = useRef(false);

  useEffect(() => {
    loadDrillSessions().then((remote) => {
      if (Array.isArray(remote) && remote.length) setSessions((current) => [...remote, ...current].filter((item, index, all) => all.findIndex((candidate) => String(candidate.id) === String(item.id)) === index).slice(0, 25));
    }).catch(() => {});
  }, []);
  const rankedWeakSubjects = useMemo(() => rankWeakSubjects(analysis.weakSubjects, adaptiveGate), [analysis.weakSubjects, adaptiveGate]);

  useEffect(() => {
    let mounted = true;

    async function loadAdaptiveGate() {
      if (!analysis.hasAttempts) return;
      try {
        setGateStatus("loading");
        const gate = await routeAdaptiveLearning({
          diagnosticHistory: dashboard.attempts || [],
          weakSubjects: analysis.weakSubjects,
          diagnosticInsights: analysis.diagnosticInsights || [],
          contentPools: {
            drills: getDrillBankQuestions().map((question) => ({
              id: question.id,
              subject: question.subjectTitle,
              subCategory: question.diagnosticSubcategory || question.subCategory,
              weaknessTag: question.diagnosticSkillTag || question.weaknessTag
            })),
            exams: getExamBlueprints().map((exam) => ({
              id: exam.id,
              title: exam.title,
              sections: (exam.sections || []).map((section) => section.subjectTitle)
            })),
            reviewers: getReviewerBlueprints().map((reviewer) => ({
              id: reviewer.id,
              title: reviewer.title,
              focusAreas: reviewer.focusAreas || reviewer.tags || []
            }))
          }
        });

        if (!mounted) return;
        setAdaptiveGate(gate);
        setGateStatus(gate.source === "local_fallback" ? "fallback" : "ready");
      } catch (error) {
        console.error("Adaptive AI gate failed:", error);
        if (mounted) {
          setAdaptiveGate(buildLocalGate(analysis));
          setGateStatus("fallback");
        }
      }
    }

    loadAdaptiveGate();
    return () => {
      mounted = false;
    };
  }, [analysis, dashboard.attempts]);

  function startDrill(subject, questionLimit = 10) {
    const diagnosticFocus = analysis.diagnosticInsights?.find((item) => item.category === subject.subject);
    const limit = Math.max(1, Number(questionLimit) || 10);
    const pulledQuestions = getQuestionsForSubject(subject.subject, limit, diagnosticFocus).slice(0, limit);
    setActiveSubject(subject.subject);
    setQuestions(pulledQuestions);
    setResponses({});
    setResults(null);
    setActiveIndex(0);
  }

  useEffect(() => {
    const focusSubject = location.state?.focusSubject;
    if (routedDrillStarted.current || !focusSubject || !analysis.hasAttempts) return;
    const subject = rankedWeakSubjects.find((item) => item.subject === focusSubject) || { subject: focusSubject };
    routedDrillStarted.current = true;
    startDrill(subject, location.state?.questionLimit || 5);
  }, [analysis.hasAttempts, location.state, rankedWeakSubjects]);

  function saveResponse(index, value) {
    setResponses((current) => ({ ...current, [index]: value }));
  }

  function toggleCheckbox(questionIndex, optionIndex) {
    const current = Array.isArray(responses[questionIndex]) ? responses[questionIndex] : [];
    saveResponse(
      questionIndex,
      current.includes(optionIndex) ? current.filter((item) => item !== optionIndex) : [...current, optionIndex]
    );
  }

  function submitDrill() {
    const orderedResponses = questions.map((_, index) => responses[index]);
    const scored = scoreDrillAttempt(questions, orderedResponses);
    const saved = saveDrillSession(user?.email, {
      subject: activeSubject,
      questions: questions.map((question) => question.id),
      responses: orderedResponses,
      ...scored,
      weaknessFocus: analysis.diagnosticInsights?.find((item) => item.category === activeSubject)?.path || []
    });
    saveDrillSessionToApi({ subject: activeSubject, pct: scored.pct, correct: scored.correct, total: scored.total, bestStreak: scored.bestStreak, points: scored.points, responses: orderedResponses, weaknessFocus: analysis.diagnosticInsights?.find((item) => item.category === activeSubject)?.path || [] }).catch(() => {});
    setSessions((current) => [saved, ...current].slice(0, 25));
    setResults(scored);
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!analysis.hasAttempts) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT }}>
        <GlobalStyle />
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold text-[var(--wd-text)]">No drills yet</h1>
          <p className="mt-2 text-base text-[var(--wd-text-muted)]">Complete a mock exam and this page will recommend what to practice, based on your results.</p>
          <Link to="/exam" className="btn-primary focus-ring mt-6 inline-flex items-center px-5 py-2.5 text-base font-semibold">
            View mock exams
          </Link>
        </div>
      </div>
    );
  }

  // ── Active drill ────────────────────────────────────────────────────────
  if (activeSubject) {
    const currentQuestion = questions[activeIndex];
    const progressPercent = questions.length ? Math.round(((activeIndex + 1) / questions.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-white p-5 md:p-10" style={{ fontFamily: FONT }}>
        <GlobalStyle />
        <div className="mx-auto max-w-2xl space-y-6">
          <button onClick={() => setActiveSubject(null)} className="focus-ring inline-flex items-center gap-2 text-base font-medium text-[var(--wd-text-muted)] transition hover:text-[var(--wd-text)]">
            <FaArrowLeft className="text-sm" /> Back
          </button>

          {!questions.length ? (
            <div className="card p-8 text-center">
              <h2 className="text-xl font-bold text-[var(--wd-text)]">No questions available</h2>
              <p className="mt-1.5 text-base text-[var(--wd-text-muted)]">There isn't a practice pool for this subject yet.</p>
            </div>
          ) : !results ? (
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-[var(--wd-text-muted)]">
                <span>{activeSubject}</span>
                <span>{activeIndex + 1} / {questions.length}</span>
              </div>
              <div className="progress-track mt-2 h-1.5 w-full">
                <div className="progress-fill h-full" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="card mt-6 p-6 md:p-8">
                <div className="text-xl font-semibold leading-relaxed text-[var(--wd-text)]" dangerouslySetInnerHTML={{ __html: currentQuestion?.stem }} />
                <div className="mt-6">{currentQuestion && renderQuestionInput(currentQuestion, activeIndex)}</div>
              </div>

              <button
                disabled={responses[activeIndex] === undefined || responses[activeIndex] === ""}
                onClick={() => (activeIndex === questions.length - 1 ? submitDrill() : setActiveIndex((index) => index + 1))}
                className="btn-primary focus-ring mt-5 w-full px-6 py-3 text-base font-semibold"
              >
                {activeIndex === questions.length - 1 ? "Submit" : "Next question"}
              </button>
            </div>
          ) : (
            <ResultsPanel
              results={results}
              activeSubject={activeSubject}
              onRetake={() => startDrill({ subject: activeSubject })}
              onBack={() => setActiveSubject(null)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Main list ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT }}>
      <GlobalStyle />
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--wd-text)]">Weakness drills</h1>
            <p className="mt-1 text-base text-[var(--wd-text-muted)]">Recommended practice, ranked by your lowest-performing subjects.</p>
          </div>
          <p className="text-sm text-[var(--wd-text-muted)]">{rankedWeakSubjects.length} subject{rankedWeakSubjects.length === 1 ? "" : "s"} · {sessions.length} drill{sessions.length === 1 ? "" : "s"} logged</p>
        </header>

        <AdaptiveGateBanner gate={adaptiveGate} status={gateStatus} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
            <DiagnosticReport analysis={analysis} adaptiveGate={adaptiveGate} />
            {sessions.length > 0 && <PreviousDrillResults sessions={sessions} />}
          </div>

          <div className="space-y-3">
            {rankedWeakSubjects.map((subject, index) => (
              <SubjectRow
                key={subject.subject}
                subject={subject}
                isAiFocus={adaptiveGate?.focus_subject === subject.subject}
                description={getDrillDescription(subject, analysis)}
                onStart={() => startDrill(subject)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  function renderQuestionInput(question, index) {
    const type = question.type || "multiple_choice";

    if (type === "multiple_choice" || type === "mcq") {
      return (
        <div className="space-y-2">
          {question.choiceOpts.map((option, optionIndex) => {
            const selected = responses[index] === optionIndex;
            return (
              <button
                key={optionIndex}
                onClick={() => saveResponse(index, optionIndex)}
                disabled={Boolean(results)}
                className={`option-row focus-ring flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-[var(--wd-text)] ${selected ? "is-selected" : ""} ${results ? "is-disabled cursor-not-allowed opacity-60" : ""}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[var(--wd-accent)] bg-[var(--wd-accent)]" : "border-gray-300"}`}>
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    if (type === "checkboxes") {
      return (
        <div className="space-y-2">
          {question.choiceOpts.map((option, optionIndex) => {
            const selected = Array.isArray(responses[index]) && responses[index].includes(optionIndex);
            return (
              <button
                key={optionIndex}
                onClick={() => toggleCheckbox(index, optionIndex)}
                disabled={Boolean(results)}
                className={`option-row focus-ring flex w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-[var(--wd-text)] ${selected ? "is-selected" : ""} ${results ? "is-disabled cursor-not-allowed opacity-60" : ""}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border ${selected ? "border-[var(--wd-accent)] bg-[var(--wd-accent)]" : "border-gray-300"}`}>
                  {selected && <FaCheck className="text-[10px] text-white" />}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <input
        value={responses[index] || ""}
        disabled={Boolean(results)}
        onChange={(event) => saveResponse(index, event.target.value)}
        className="focus-ring w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-[var(--wd-text)] outline-none transition focus:border-[var(--wd-accent)]"
        placeholder="Type your answer..."
      />
    );
  }
}

// ── Subject row ─────────────────────────────────────────────────────────
function SubjectRow({ subject, isAiFocus, description, onStart }) {
  const pct = safePercent(subject.averagePct);

  return (
    <div className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${isAiFocus ? "border-[var(--wd-accent)]" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[var(--wd-text)]">{subject.subject}</h3>
          {isAiFocus && <AIFocusTag />}
        </div>
        <p className="mt-0.5 text-base text-[var(--wd-text-muted)]">{description}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="progress-track h-1.5 w-32">
            <div className="progress-fill h-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-medium text-[var(--wd-text-muted)]">{pct}% avg</span>
        </div>
      </div>
      <button onClick={onStart} className="btn-primary focus-ring shrink-0 px-4 py-2 text-base font-semibold">
        Practice
      </button>
    </div>
  );
}

function AIFocusTag() {
  return (
    <span className="group relative inline-flex">
      <span tabIndex="0" className="cursor-help rounded-full bg-[var(--wd-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--wd-accent)]">
        AI focus
      </span>
      <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border border-[var(--wd-border)] bg-white px-3 py-2 text-sm font-medium leading-5 text-[var(--wd-text)] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
        Highest priority for improvement based on your recent exam performance.
      </span>
    </span>
  );
}

// ── Diagnostic report card ─────────────────────────────────────────────
function DiagnosticReport({ analysis, adaptiveGate }) {
  const aiFocusSubject = adaptiveGate?.focus_subject;

  const diagnostic = useMemo(() => {
    if (!aiFocusSubject || !analysis.diagnosticInsights) return analysis.primaryDiagnostic;
    return analysis.diagnosticInsights.find((item) => item.category === aiFocusSubject) || analysis.primaryDiagnostic;
  }, [analysis.primaryDiagnostic, analysis.diagnosticInsights, aiFocusSubject]);

  const narrative = buildDiagnosticNarrativeFromDiagnostic(analysis, diagnostic);

  return (
    <section className="card p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--wd-text-muted)]">Diagnostic</p>
      <h2 className="mt-1.5 text-lg font-bold leading-snug text-[var(--wd-text)]">{diagnostic ? getDiagnosticHeadline(diagnostic) : "Insights unlock after your first mock exam."}</h2>
      {diagnostic && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--wd-text-muted)]">
          <span>Avg. time</span>
          <span className="font-semibold text-[var(--wd-text)]">{formatAverageTime(diagnostic.averageSeconds)}</span>
        </div>
      )}
      <p className="mt-3 text-base leading-6 text-[var(--wd-text-muted)]">{narrative}</p>
      {diagnostic && (
        <ul className="mt-3 space-y-1 text-base text-[var(--wd-text)]">
          <li>· Practice {diagnostic.skillTag || diagnostic.subcategory || diagnostic.category} first.</li>
          <li>· Drill 10 items, then review every miss.</li>
        </ul>
      )}
      {diagnostic?.path?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {diagnostic.path.map((label) => (
            <span key={label} className="rounded-md bg-[var(--wd-surface)] px-2 py-1 text-[11px] font-medium text-[var(--wd-text-muted)]">{label}</span>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Adaptive routing banner ────────────────────────────────────────────
function AdaptiveGateBanner({ gate, status }) {
  if (status === "idle") return null;

  return (
    <section className="flex items-start gap-3 rounded-lg border border-[var(--wd-border)] bg-[var(--wd-surface)] px-4 py-3">
      {status === "loading" ? (
        <>
          <FaSpinner className="mt-0.5 shrink-0 animate-spin text-base text-[var(--wd-text-muted)]" />
          <p className="text-base text-[var(--wd-text-muted)]">Reading your diagnostics to route the next drill…</p>
        </>
      ) : (
        <div>
          <p className="text-base font-semibold text-[var(--wd-text)]">
            {gate?.focus_subject ? `Recommended focus: ${gate.focus_subject}` : "Building your route"}
          </p>
          <p className="mt-0.5 text-base text-[var(--wd-text-muted)]">{gate?.rationale || "Complete a mock exam to activate automatic drill routing."}</p>
        </div>
      )}
    </section>
  );
}

// ── Results panel ──────────────────────────────────────────────────────
function ResultsPanel({ results, activeSubject, onRetake, onBack }) {
  return (
    <div className="card p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--wd-text-muted)]">{activeSubject}</p>
      <p className="mt-2 text-6xl font-bold tracking-tight text-[var(--wd-text)]">{results.pct}%</p>
      <p className="mt-1 text-base text-[var(--wd-text-muted)]">{results.correct} of {results.total} correct</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--wd-border)] p-4">
          <p className="text-sm font-medium text-[var(--wd-text-muted)]">Best streak</p>
          <p className="mt-1 text-3xl font-bold text-[var(--wd-text)]">{results.bestStreak}</p>
        </div>
        <div className="rounded-lg border border-[var(--wd-border)] p-4">
          <p className="text-sm font-medium text-[var(--wd-text-muted)]">Points earned</p>
          <p className="mt-1 text-3xl font-bold text-[var(--wd-text)]">{results.points}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-[var(--wd-text-muted)]">Answer review</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {results.items.map((item, index) => (
            <span
              key={index}
              title={item.isCorrect ? "Correct" : "Incorrect"}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                item.isCorrect ? "bg-[var(--wd-success-soft)] text-[var(--wd-success)]" : "bg-gray-100 text-gray-400"
              }`}
            >
              {index + 1}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button onClick={onRetake} className="btn-primary focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 text-base font-semibold">
          <FaRedo className="text-sm" /> Try again
        </button>
        <button onClick={onBack} className="btn-secondary focus-ring px-5 py-2.5 text-base font-semibold">
          Back to recommendations
        </button>
      </div>
    </div>
  );
}

// ── Previous drill sessions ────────────────────────────────────────────
function PreviousDrillResults({ sessions }) {
  return (
    <section className="card p-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--wd-text-muted)]">Previous results</p>
      <div className="mt-3 space-y-1">
        {sessions.slice(0, 5).map((session, index) => {
          const score = safePercent(session?.pct);
          const total = Number(session?.total);
          const correct = Number(session?.correct);
          return (
            <div key={session?.id || `${session?.subject}-${index}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--wd-surface)]">
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-[var(--wd-text)]">{session?.subject || "Practice drill"}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--wd-text-muted)]">
                  {Number.isFinite(correct) && Number.isFinite(total) && total > 0 ? `${correct}/${total} correct` : "Score recorded"} · {session?.completedAt ? new Date(session.completedAt).toLocaleDateString() : "Recent"}
                </p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-sm font-semibold ${score >= 75 ? "bg-[var(--wd-success-soft)] text-[var(--wd-success)]" : "bg-[var(--wd-surface)] text-[var(--wd-text-muted)]"}`}>{score}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildDiagnosticNarrativeFromDiagnostic(analysis, diagnostic) {
  if (!analysis.hasAttempts || !diagnostic) {
    return analysis.hasAttempts
      ? "Complete another mock exam to add more per-question timing, answer-change, and diagnostic data to this report."
      : "Take a mock exam first to identify performance bottlenecks and useful practice areas.";
  }
  const target = diagnostic.skillTag && diagnostic.skillTag !== "Untyped Skill" ? `${diagnostic.subcategory} with ${diagnostic.skillTag}` : diagnostic.subcategory || diagnostic.category;
  if (diagnostic.insightType === "self-doubt") return `Your recent attempts show correct choices changing to wrong answers under pressure during ${diagnostic.category}. Review your reasoning before changing an answer, especially for ${target}.`;
  if (diagnostic.insightType === "time-bottleneck") return `Timing data points to a bottleneck in ${target}. You spend an average of ${formatAverageTime(diagnostic.averageSeconds)} on these questions.`;
  return `Your misses are clustering around ${target}. The drills below prioritize available questions that match those diagnostic labels.`;
}

function getDiagnosticHeadline(diagnostic) {
  if (diagnostic.insightType === "self-doubt") return "Behavioral pattern: second-guessing under pressure";
  if (diagnostic.insightType === "time-bottleneck") return "Time bottleneck detected";
  return "Structural weakness detected";
}

function formatAverageTime(seconds = 0) {
  const safeSeconds = Number(seconds);
  if (!Number.isFinite(safeSeconds) || safeSeconds < 5) return "Not enough data yet";
  if (safeSeconds < 60) return `${Math.round(safeSeconds)}s`;
  return `${(safeSeconds / 60).toFixed(1)} min`;
}

function safePercent(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}


function getDrillDescription(subject, analysis) {
  const focus = analysis.diagnosticInsights?.find((item) => item.category === subject.subject);
  const skill = focus?.skillTag || focus?.subcategory;
  return skill ? `Practice ${skill} with targeted questions and answer review.` : "Build accuracy with a focused 10-question practice block.";
}

function rankWeakSubjects(subjects, gate) {
  const order = gate?.drill_subject_order || [];
  if (!order.length) return subjects;
  return [...subjects].sort((a, b) => {
    const aIndex = order.findIndex((item) => item.toLowerCase() === a.subject.toLowerCase());
    const bIndex = order.findIndex((item) => item.toLowerCase() === b.subject.toLowerCase());
    const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return normalizedA - normalizedB || a.averagePct - b.averagePct;
  });
}

function buildLocalGate(analysis) {
  const focus = analysis.weakSubjects?.[0]?.subject || "General Practice";
  return {
    focus_subject: focus,
    confidence: 0.4,
    rationale: `Local routing is prioritizing ${focus} from your lowest mastery score while Groq is unavailable.`,
    drill_subject_order: analysis.weakSubjects?.map((subject) => subject.subject) || [focus],
    reviewer_focus_tags: [focus],
    exam_focus_tags: [focus],
    source: "local_fallback"
  };
}