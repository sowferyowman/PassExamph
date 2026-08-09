import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaArrowLeft, FaBrain, FaCheck, FaRedo, FaSpinner } from "react-icons/fa";
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
const MAX_DRILL_TOKENS = 100000;
const TAILORED_BATCH_SIZE = 10;


const TIERS = {
  strength: { label: "Strength", badge: "bg-emerald-100 text-emerald-700", accent: "text-emerald-700", hex: "#10b981" },
  developing: { label: "Developing", badge: "bg-blue-100 text-blue-700", accent: "text-blue-700", hex: "#2563eb" },
  priority: { label: "Priority", badge: "bg-rose-100 text-rose-700", accent: "text-rose-700", hex: "#f43f5e" }
};

function getTier(pct) {
  if (pct >= 80) return TIERS.strength;
  if (pct >= 65) return TIERS.developing;
  return TIERS.priority;
}

function RichText({ text, boldClassName = "font-black text-[var(--wd-text)]" }) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className={boldClassName}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CircularProgress({ pct, size, strokeWidth, color, trackColor = "#e2e8f0", active = true, duration = 900, delay = 0, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const t = setTimeout(() => setDrawn(pct), delay);
    return () => clearTimeout(t);
  }, [pct, active, delay]);

  const offset = circumference - (drawn / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.65,0,0.35,1)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

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
        background: #003A6C;
        color: #fff;
        border-radius: 8px;
        transition: background 0.15s ease;
      }
      .btn-primary:hover:not(:disabled) { background: #002A4C; }
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

      .subject-card {
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      }
      .subject-card:hover:not(.is-disabled) { border-color: #d1d5db; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06); transform: translateY(-1px); }
      .subject-card:active:not(.is-disabled) { transform: translateY(0); }

      .focus-ring:focus-visible { outline: 2px solid var(--wd-accent); outline-offset: 2px; }

      @media (prefers-reduced-motion: reduce) {
        .progress-fill { transition: none; }
        .subject-card { transition: none; }
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
  const [tailoredPractice, setTailoredPractice] = useState(null);
  const routedDrillStarted = useRef(false);

  useEffect(() => {
    loadDrillSessions().then((remote) => {
      if (Array.isArray(remote) && remote.length) setSessions((current) => [...remote, ...current].filter((item, index, all) => all.findIndex((candidate) => String(candidate.id) === String(item.id)) === index).slice(0, 25));
    }).catch(() => {});
  }, []);
  const rankedWeakSubjects = useMemo(() => rankWeakSubjects(analysis.weakSubjects, adaptiveGate), [analysis.weakSubjects, adaptiveGate]);
  const groqDrillLabels = useMemo(
    () => selectDrillLabelsWithinTokenBudget(getDrillBankQuestions()),
    []
  );
  const tailoredDrillIds = useMemo(
    () => getTailoredDrillIds(getDrillBankQuestions(), adaptiveGate?.recommended_drill_filters),
    [adaptiveGate]
  );
  const optionalPracticeSubjects = useMemo(() => {
    const hasTailoredDrill = tailoredDrillIds.length > 0;
    return hasTailoredDrill
      ? rankedWeakSubjects.filter((subject) => subject.subject !== adaptiveGate.focus_subject)
      : rankedWeakSubjects;
  }, [adaptiveGate, rankedWeakSubjects, tailoredDrillIds]);

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
            drills: groqDrillLabels,
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
  }, [analysis, dashboard.attempts, groqDrillLabels]);

  function startDrill(subject, questionLimit = 10, drillIds = []) {
    const diagnosticFocus = analysis.diagnosticInsights?.find((item) => item.category === subject.subject);
    const limit = Math.max(1, Number(questionLimit) || 10);
    const selectedIds = new Set(Array.isArray(drillIds) ? drillIds.map(String) : []);
    const drillById = new Map(getDrillBankQuestions().map((question) => [String(question.id), question]));
    const selectedQuestions = selectedIds.size
      ? drillIds.map(String).map((id) => drillById.get(id)).filter(Boolean)
      : [];
    const pulledQuestions = (selectedQuestions.length
      ? selectedQuestions
      : getQuestionsForSubject(subject.subject, limit, diagnosticFocus)
    ).slice(0, limit);
    setActiveSubject(subject.subject);
    setQuestions(pulledQuestions);
    setResponses({});
    setResults(null);
    setActiveIndex(0);
    setTailoredPractice(null);
  }

  function startTailoredPractice(offset = 0) {
    const batchIds = tailoredDrillIds.slice(offset, offset + TAILORED_BATCH_SIZE);
    const firstDrill = getDrillBankQuestions().find((question) => String(question.id) === batchIds[0]);
    const subject = rankedWeakSubjects.find((item) => item.subject === adaptiveGate?.focus_subject)
      || { subject: firstDrill?.subjectTitle || adaptiveGate?.focus_subject || "General Practice" };
    const diagnosticFocus = analysis.diagnosticInsights?.find((item) => item.category === subject.subject);
    const drillById = new Map(getDrillBankQuestions().map((question) => [String(question.id), question]));
    const pulledQuestions = batchIds.map((id) => drillById.get(id)).filter(Boolean);
    setActiveSubject(subject.subject);
    setQuestions(pulledQuestions.length ? pulledQuestions : getQuestionsForSubject(subject.subject, TAILORED_BATCH_SIZE, diagnosticFocus));
    setResponses({});
    setResults(null);
    setActiveIndex(0);
    setTailoredPractice({ offset, total: tailoredDrillIds.length });
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

  //  Empty state 
  if (!analysis.hasAttempts) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT }}>
        <GlobalStyle />
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold text-[var(--wd-text)]">No drills yet</h1>
          <p className="mt-2 text-sm text-[var(--wd-text-muted)]">Complete a mock exam and this page will recommend what to practice, based on your results.</p>
          <Link to="/exam" className="btn-primary focus-ring mt-6 inline-flex items-center px-5 py-2.5 text-sm font-semibold">
            View mock exams
          </Link>
        </div>
      </div>
    );
  }

  //  Active drill  
  if (activeSubject) {
    const currentQuestion = questions[activeIndex];
    const progressPercent = questions.length ? Math.round(((activeIndex + 1) / questions.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-white p-5 md:p-10" style={{ fontFamily: FONT }}>
        <GlobalStyle />
        <div className="mx-auto max-w-2xl space-y-6">
          <button onClick={() => setActiveSubject(null)} className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-[var(--wd-text-muted)] transition hover:text-[var(--wd-text)]">
            <FaArrowLeft className="text-xs" /> Back
          </button>

          {!questions.length ? (
            <div className="card p-8 text-center">
              <h2 className="text-lg font-bold text-[var(--wd-text)]">No questions available</h2>
              <p className="mt-1.5 text-sm text-[var(--wd-text-muted)]">There isn't a practice pool for this subject yet.</p>
            </div>
          ) : !results ? (
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-[var(--wd-text-muted)]">
                <span>{activeSubject}</span>
                <span>{activeIndex + 1} / {questions.length}</span>
              </div>
              <div className="progress-track mt-2 h-1.5 w-full">
                <div className="progress-fill h-full" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="card mt-6 p-6 md:p-8">
                <div className="text-lg font-semibold leading-relaxed text-[var(--wd-text)]" dangerouslySetInnerHTML={{ __html: currentQuestion?.stem }} />
                <div className="mt-6">{currentQuestion && renderQuestionInput(currentQuestion, activeIndex)}</div>
              </div>

              <button
                disabled={responses[activeIndex] === undefined || responses[activeIndex] === ""}
                onClick={() => (activeIndex === questions.length - 1 ? submitDrill() : setActiveIndex((index) => index + 1))}
                className="btn-primary focus-ring mt-5 w-full px-6 py-3 text-sm font-semibold"
              >
                {activeIndex === questions.length - 1 ? "Submit" : "Next question"}
              </button>
            </div>
          ) : (
            <ResultsPanel
              results={results}
              activeSubject={activeSubject}
              onRetake={() => startDrill({ subject: activeSubject })}
              onContinue={tailoredPractice && tailoredPractice.offset + questions.length < tailoredPractice.total
                ? () => startTailoredPractice(tailoredPractice.offset + questions.length)
                : null}
              onBack={() => { setActiveSubject(null); setTailoredPractice(null); }}
            />
          )}
        </div>
      </div>
    );
  }

  //  Main list 
  return (
    <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT }}>
      <GlobalStyle />
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--wd-text)]">Weakness drills</h1>
            <p className="mt-1 text-sm text-[var(--wd-text-muted)]">Recommended practice, ranked by your lowest-performing subjects across all your attempts.</p>
          </div>
          <p className="text-xs text-[var(--wd-text-muted)]">{rankedWeakSubjects.length} subject{rankedWeakSubjects.length === 1 ? "" : "s"} · {sessions.length} drill{sessions.length === 1 ? "" : "s"} logged</p>
        </header>

        <AdaptiveGateBanner
          gate={adaptiveGate}
          status={gateStatus}
          tailoredDrillCount={tailoredDrillIds.length}
          onStartTailored={() => startTailoredPractice()}
        />

        <div className={`mt-6 grid items-start gap-6 ${sessions.length > 0 ? "lg:grid-cols-[300px_1fr]" : ""}`}>
          {sessions.length > 0 && (
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <PreviousDrillResults sessions={sessions} />
            </div>
          )}

          <div className="space-y-3">
            {tailoredDrillIds.length > 0 && optionalPracticeSubjects.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wd-text-muted)]">Other practice areas</p>
            )}
            {optionalPracticeSubjects.map((subject) => (
              <SubjectRow
                key={subject.subject}
                subject={subject}
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
                className={`option-row focus-ring flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--wd-text)] ${selected ? "is-selected" : ""} ${results ? "is-disabled cursor-not-allowed opacity-60" : ""}`}
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
                className={`option-row focus-ring flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--wd-text)] ${selected ? "is-selected" : ""} ${results ? "is-disabled cursor-not-allowed opacity-60" : ""}`}
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
        className="focus-ring w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-[var(--wd-text)] outline-none transition focus:border-[var(--wd-accent)]"
        placeholder="Type your answer..."
      />
    );
  }
}

function SubjectRow({ subject, description, onStart }) {
  const pct = safePercent(subject.averagePct);
  const tier = getTier(pct);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStart();
        }
      }}
      className="card subject-card focus-ring flex cursor-pointer items-center gap-4 p-5"
    >
      <CircularProgress pct={pct} size={64} strokeWidth={6} color={tier.hex} duration={900}>
        <span className={`text-sm font-black ${tier.accent}`}>{pct}%</span>
      </CircularProgress>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--wd-text)]">{subject.subject}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${tier.badge}`}>{tier.label}</span>
        </div>
        <p className="mt-0.5 text-sm text-[var(--wd-text-muted)]">{description}</p>
      </div>
    </div>
  );
}

//  Adaptive routing banner 

function AdaptiveGateBanner({ gate, status, tailoredDrillCount, onStartTailored }) {
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--wd-border)] bg-[var(--wd-surface)] px-6 py-5">
        <FaSpinner className="shrink-0 animate-spin text-[var(--wd-accent)]" />
        <p className="text-sm font-medium text-[var(--wd-text-muted)]">Reading your diagnostics to route the next drill…</p>
      </div>
    );
  }

  const confidencePct = Number.isFinite(gate?.confidence) ? Math.round(gate.confidence * 100) : null;
  const tags = [...new Set([...(gate?.reviewer_focus_tags || []), ...(gate?.exam_focus_tags || [])])].slice(0, 5);
  const upNext = (gate?.drill_subject_order || []).filter((subject) => subject !== gate?.focus_subject).slice(0, 3);

  return (
    <div className="overflow-hidden rounded-2xl border-l-4 border-[var(--wd-accent)] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--wd-accent-soft)]">
          <FaBrain className="text-lg text-[var(--wd-accent)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--wd-accent)]">Recommendations</p>
            {confidencePct != null && (
              <span className="rounded-full bg-[var(--wd-surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--wd-text-muted)]">
                {confidencePct}% confidence
              </span>
            )}
          </div>

          <h2 className="mt-1 text-lg font-bold text-[var(--wd-text)]">{gate?.focus_subject || "Building your route"}</h2>

          <p className="mt-2 text-sm leading-6 text-[var(--wd-text-muted)]">
            {gate?.rationale ? (
              <RichText text={gate.rationale} boldClassName="font-bold text-[var(--wd-text)]" />
            ) : (
              "Complete a mock exam to activate automatic drill routing."
            )}
          </p>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--wd-surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--wd-text-muted)]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {tailoredDrillCount > 0 && (
            <button onClick={onStartTailored} className="btn-primary focus-ring mt-4 px-4 py-2 text-sm font-semibold">
              Start tailored practice ({tailoredDrillCount} related questions)
            </button>
          )}

          {upNext.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--wd-border)] pt-3 text-xs text-[var(--wd-text-muted)]">
              <span className="font-semibold text-[var(--wd-text)]">Up next after this:</span>
              {upNext.map((subject, i) => (
                <span key={subject}>
                  {i > 0 && <span className="mx-1 text-[var(--wd-border)]">·</span>}
                  {subject}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//  Results panel 
function ResultsPanel({ results, activeSubject, onRetake, onContinue, onBack }) {
  return (
    <div className="card p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wd-text-muted)]">{activeSubject}</p>
      <p className="mt-2 text-5xl font-bold tracking-tight text-[var(--wd-text)]">{results.pct}%</p>
      <p className="mt-1 text-sm text-[var(--wd-text-muted)]">{results.correct} of {results.total} correct</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[var(--wd-border)] p-4">
          <p className="text-xs font-medium text-[var(--wd-text-muted)]">Best streak</p>
          <p className="mt-1 text-2xl font-bold text-[var(--wd-text)]">{results.bestStreak}</p>
        </div>
        <div className="rounded-lg border border-[var(--wd-border)] p-4">
          <p className="text-xs font-medium text-[var(--wd-text-muted)]">Points earned</p>
          <p className="mt-1 text-2xl font-bold text-[var(--wd-text)]">{results.points}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-[var(--wd-text-muted)]">Answer review</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {results.items.map((item, index) => (
            <span
              key={index}
              title={item.isCorrect ? "Correct" : "Incorrect"}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                item.isCorrect ? "bg-[var(--wd-success-soft)] text-[var(--wd-success)]" : "bg-gray-100 text-gray-400"
              }`}
            >
              {index + 1}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        {onContinue && (
          <button onClick={onContinue} className="btn-primary focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold">
            Continue tailored practice
          </button>
        )}
        <button onClick={onRetake} className="btn-primary focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold">
          <FaRedo className="text-xs" /> Try again
        </button>
        <button onClick={onBack} className="btn-secondary focus-ring px-5 py-2.5 text-sm font-semibold">
          Back to recommendations
        </button>
      </div>
    </div>
  );
}

//  Previous drill sessions 
function PreviousDrillResults({ sessions }) {
  return (
    <section className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wd-text-muted)]">Previous results</p>
      <div className="mt-3 space-y-1">
        {sessions.slice(0, 5).map((session, index) => {
          const score = safePercent(session?.pct);
          const total = Number(session?.total);
          const correct = Number(session?.correct);
          return (
            <div key={session?.id || `${session?.subject}-${index}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-[var(--wd-surface)]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--wd-text)]">{session?.subject || "Practice drill"}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--wd-text-muted)]">
                  {Number.isFinite(correct) && Number.isFinite(total) && total > 0 ? `${correct}/${total} correct` : "Score recorded"} · {session?.completedAt ? new Date(session.completedAt).toLocaleDateString() : "Recent"}
                </p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${score >= 75 ? "bg-[var(--wd-success-soft)] text-[var(--wd-success)]" : "bg-[var(--wd-surface)] text-[var(--wd-text-muted)]"}`}>{score}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
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

// Send every drill label that fits the prompt budget. Groq is responsible for
// semantic relevance and ranking; no client-side subject or skill matching is applied.
function selectDrillLabelsWithinTokenBudget(drillBank, tokenBudget = MAX_DRILL_TOKENS) {
  let usedTokens = 0;
  const labels = [];

  for (const question of drillBank) {
    const entry = {
      id: question.id,
      title: question.title,
      subject: question.subjectTitle,
      subCategory: question.diagnosticSubcategory || question.subCategory,
      weaknessTag: question.diagnosticSkillTag || question.weaknessTag
    };
    const estimatedTokens = Math.ceil(JSON.stringify(entry).length / 4);
    if (usedTokens + estimatedTokens > tokenBudget) break;
    labels.push(entry);
    usedTokens += estimatedTokens;
  }

  return labels;
}

function getTailoredDrillIds(drillBank, filters) {
  if (!Array.isArray(filters) || !filters.length) return [];
  const normalize = (value) => String(value || "").trim().toLowerCase();
  return drillBank
    .filter((question) => filters.some((filter) => {
      const subjectMatches = normalize(question.subjectTitle) === normalize(filter.subject);
      const subCategoryMatches = !normalize(filter.subCategory)
        || normalize(question.diagnosticSubcategory || question.subCategory) === normalize(filter.subCategory);
      const weaknessMatches = !normalize(filter.weaknessTag)
        || normalize(question.diagnosticSkillTag || question.weaknessTag) === normalize(filter.weaknessTag);
      return subjectMatches && subCategoryMatches && weaknessMatches;
    }))
    .map((question) => String(question.id));
}

function buildLocalGate(analysis) {
  const focus = analysis.weakSubjects?.[0]?.subject || "General Practice";
  return {
    focus_subject: focus,
    confidence: 0.4,
    rationale: `**${focus}** is your lowest average right now, so that's the local pick while your coach reconnects.`,
    drill_subject_order: analysis.weakSubjects?.map((subject) => subject.subject) || [focus],
    recommended_drill_filters: [{ subject: focus, subCategory: "", weaknessTag: "" }],
    reviewer_focus_tags: [focus],
    exam_focus_tags: [focus],
    source: "local_fallback"
  };
}
