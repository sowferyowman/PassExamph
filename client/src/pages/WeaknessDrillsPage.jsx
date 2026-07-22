import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaBrain, FaCheckCircle, FaPlay, FaRoute, FaSpinner, FaTimesCircle, FaBolt, FaRedo, FaTrophy } from "react-icons/fa";
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

export default function WeaknessDrillsPage() {
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

  function startDrill(subject) {
    const diagnosticFocus = analysis.diagnosticInsights?.find((item) => item.category === subject.subject);
    const pulledQuestions = getQuestionsForSubject(subject.subject, 10, diagnosticFocus).slice(0, 10);
    setActiveSubject(subject.subject);
    setQuestions(pulledQuestions);
    setResponses({});
    setResults(null);
    setActiveIndex(0);
  }

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

  if (!analysis.hasAttempts) {
    return (
      <div className="min-h-screen bg-rose-50/40 p-6">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <p className="text-xs font-black uppercase tracking-wider text-rose-700">Weakness Drills</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Recommended Practice Blocks</h1>
            <p className="mt-1 text-slate-500">Targeted practice is based on completed mock exam results.</p>
          </header>
          <section className="rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
            <div className="inline-flex rounded-xl bg-rose-50 p-4 text-3xl text-rose-600"><FaBrain /></div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">Complete a mock exam to receive drill recommendations.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">After your first scored attempt, this page will identify useful practice areas from subject results and per-question diagnostics.</p>
            <Link to="/exam" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
              <FaPlay /> View Mock Exams
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (activeSubject) {
    const currentQuestion = questions[activeIndex];
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-emerald-50 p-5 md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <button onClick={() => setActiveSubject(null)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-900">
            <FaArrowLeft /> Back to Recommendations
          </button>

          {!questions.length ? (
            <div className="rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-lg">
              <h2 className="text-2xl font-black text-slate-950">No question pool available yet.</h2>
              <p className="mt-2 text-sm text-slate-500">No practice questions are available for this subject yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {!results ? (
                <article className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl transition-all duration-300 md:p-10">
                  <div className="flex items-center justify-between gap-4">
                    <div><p className="text-xs font-black uppercase tracking-widest text-amber-600"><FaBolt className="mr-1 inline" /> Quiz Bee Round</p><h1 className="mt-1 text-2xl font-black text-slate-950">{activeSubject} Flashcards</h1></div>
                    <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">Question {activeIndex + 1} of {questions.length}</span>
                  </div>
                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500" style={{ width: `${((activeIndex + 1) / questions.length) * 100}%` }} /></div>
                  <div className="mt-10 text-center text-xl font-black leading-relaxed text-slate-900" dangerouslySetInnerHTML={{ __html: currentQuestion?.stem }} />
                  <div className="mt-8">{currentQuestion && renderQuestionInput(currentQuestion, activeIndex)}</div>
                  <button disabled={responses[activeIndex] === undefined || responses[activeIndex] === ""} onClick={() => activeIndex === questions.length - 1 ? submitDrill() : setActiveIndex((index) => index + 1)} className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">{activeIndex === questions.length - 1 ? "Finish Round" : "Lock In Answer →"}</button>
                </article>
              ) : (
                <article className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
                  <FaTrophy className="mx-auto text-5xl text-amber-500" /><p className="mt-3 text-xs font-black uppercase tracking-widest text-emerald-600">Round Complete!</p>
                  <h2 className="mt-2 text-4xl font-black text-slate-950">{results.pct}%</h2><p className="mt-2 font-semibold text-slate-500">{results.correct} of {results.total} correct</p>
                  <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-700">Best Streak</p><p className="text-2xl font-black text-amber-900">{results.bestStreak}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">Points Earned</p><p className="text-2xl font-black text-emerald-900">{results.points}</p></div></div>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">{results.items.map((item, index) => <span key={index} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${item.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{item.isCorrect ? <FaCheckCircle /> : <FaTimesCircle />} {item.isCorrect ? "Correct" : "Incorrect"}</span>)}</div>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={() => startDrill({ subject: activeSubject })} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"><FaRedo /> Try Again</button><button onClick={() => setActiveSubject(null)} className="flex-1 rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700">Back to Recommendations</button></div>
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50/40 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Weakness Drills</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Recommended Practice Blocks</h1>
          <p className="mt-1 text-slate-500">Based on your lowest-performing mock exam subject categories.</p>
        </header>

        <AdaptiveGatePanel gate={adaptiveGate} status={gateStatus} />
        {/* FIX: Ipinasa na ang adaptiveGate state para sumabay ang dynamic layout rendering */}
        <DiagnosticReport analysis={analysis} adaptiveGate={adaptiveGate} />

        {sessions.length > 0 && <div className="mb-6 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-amber-700">Saved Practice Sessions</p><div className="mt-3 flex flex-wrap gap-2">{sessions.slice(0, 4).map((session) => <span key={session.id} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{session.subject} · {session.pct}%</span>)}</div></div>}

        <div className="space-y-3">
          {rankedWeakSubjects.map((subject) => (
            <article
              key={subject.subject}
              className={`group flex cursor-pointer items-center justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                adaptiveGate?.focus_subject === subject.subject ? "border-rose-300 ring-2 ring-rose-100" : "border-stone-200"
              }`}
              onClick={() => startDrill(subject)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <FaBrain className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-bold text-slate-950">{subject.subject}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    <span className="text-sm text-slate-500">Avg: <span className="font-semibold text-slate-800">{subject.averagePct}%</span></span>
                    <span className="text-sm text-slate-500">Lowest: <span className="font-semibold text-rose-600">{subject.lowestPct}%</span></span>
                    {adaptiveGate?.focus_subject === subject.subject && <span className="text-xs font-black uppercase tracking-wider text-rose-700">AI Focus</span>}
                  </div>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                  onClick={(event) => {
                    event.stopPropagation();
                    startDrill(subject);
                  }}
                >
                  <FaPlay className="text-xs" /> Start
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );

  function renderQuestionInput(question, index) {
    const type = question.type || "multiple_choice";
    if (type === "multiple_choice" || type === "mcq") {
      return (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {question.choiceOpts.map((option, optionIndex) => (
            <button
              key={optionIndex}
              onClick={() => saveResponse(index, optionIndex)}
              disabled={Boolean(results)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${
                responses[index] === optionIndex ? "border-rose-300 bg-rose-50 text-rose-700" : "border-stone-200 bg-stone-50 text-slate-700 hover:border-rose-200"
              } ${results ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black">{String.fromCharCode(65 + optionIndex)}</span>
              {option}
            </button>
          ))}
        </div>
      );
    }

    if (type === "checkboxes") {
      return (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {question.choiceOpts.map((option, optionIndex) => {
            const selected = Array.isArray(responses[index]) && responses[index].includes(optionIndex);
            return (
              <button
                key={optionIndex}
                onClick={() => toggleCheckbox(index, optionIndex)}
                disabled={Boolean(results)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${
                  selected ? "border-rose-300 bg-rose-50 text-rose-700" : "border-stone-200 bg-stone-50 text-slate-700 hover:border-rose-200"
                } ${results ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black">{selected ? "X" : ""}</span>
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
        className="mt-4 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
        placeholder="Type your answer..."
      />
    );
  }
}

// FIX: Ginawang dynamic ang component para laging synchronized sa kasalukuyang AI target subject
function DiagnosticReport({ analysis, adaptiveGate }) {
  const aiFocusSubject = adaptiveGate?.focus_subject;

  const diagnostic = useMemo(() => {
    if (!aiFocusSubject || !analysis.diagnosticInsights) return analysis.primaryDiagnostic;
    return analysis.diagnosticInsights.find(item => item.category === aiFocusSubject) || analysis.primaryDiagnostic;
  }, [analysis.primaryDiagnostic, analysis.diagnosticInsights, aiFocusSubject]);

  const narrative = buildDiagnosticNarrativeFromDiagnostic(analysis, diagnostic);

  return (
    <section className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Performance Diagnostic</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{diagnostic ? getDiagnosticHeadline(diagnostic) : "Personalized insights unlock after your first mock."}</h2>
        </div>
        {diagnostic && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-right">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Avg. Time</p>
            <p className="text-lg font-black text-rose-700">{formatAverageTime(diagnostic.averageSeconds)}</p>
          </div>
        )}
      </div>
      <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-600">{narrative}</p>
      {diagnostic && (
        <div className="mt-5 flex flex-wrap gap-2">
          {diagnostic.path?.map((label) => (
            <span key={label} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-slate-500">{label}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function AdaptiveGatePanel({ gate, status }) {
  return (
    <section className="mb-6 rounded-xl border border-rose-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-rose-700">Adaptive AI Learning Gate</p>
          <h2 className="mt-2 flex items-center gap-3 text-2xl font-black text-slate-950">
            <FaRoute className="text-rose-600" />
            {gate?.focus_subject ? `${gate.focus_subject} Priority Route` : "Building your route"}
          </h2>
        </div>
        <span className={`rounded-lg px-3 py-1.5 text-xs font-black ${status === "ready" ? "bg-emerald-50 text-emerald-700" : status === "fallback" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
          {status === "loading" ? "Routing" : status === "ready" ? "Routed" : status === "fallback" ? "Local Backup" : "Waiting"}
        </span>
      </div>

      {status === "loading" ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <FaSpinner className="animate-spin" />
          Reading past diagnostics, fallback logs, and available drill pools.
        </p>
      ) : (
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
          {gate?.rationale || "Complete a mock exam to activate automatic drill routing."}
        </p>
      )}
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
  if (!seconds) return "No timing yet";
  if (seconds < 60) return `${seconds}s`;
  return `${(seconds / 60).toFixed(1)} min`;
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
