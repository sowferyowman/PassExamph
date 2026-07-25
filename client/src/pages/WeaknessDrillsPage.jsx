import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaBrain, FaCheckCircle, FaPlay, FaRoute, FaSpinner, FaTimesCircle, FaBolt, FaRedo, FaTrophy, FaCircle } from "react-icons/fa";
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
      <div className="min-h-screen bg-white p-6">
        <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">
            <FaCircle className="animate-pulse text-[6px]" /> Weakness Drills
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Recommended Practice Blocks</h1>
          <p className="mt-2 max-w-md text-slate-500">Targeted practice is based on completed mock exam results.</p>

          <section className="relative mt-10 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-10 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.15)] backdrop-blur-xl">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-100 blur-3xl" />
            <span className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-100 blur-3xl" />
            <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-4xl text-blue-600"><FaBrain /></div>
            <h2 className="relative mt-6 text-2xl font-black text-slate-950">Complete a mock exam to receive drill recommendations.</h2>
            <p className="relative mx-auto mt-2 max-w-2xl text-sm font-semibold text-slate-500">After your first scored attempt, this page will identify useful practice areas from subject results and per-question diagnostics.</p>
            <Link to="/exam" className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-[0_10px_25px_-10px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:bg-slate-800">
              <FaPlay /> View Mock Exams
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (activeSubject) {
    const currentQuestion = questions[activeIndex];
    const progressPercent = questions.length ? Math.round(((activeIndex + 1) / questions.length) * 100) : 0;
    const ringRadius = 46;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference - (progressPercent / 100) * ringCircumference;

    return (
      <div className="min-h-screen bg-white p-5 md:p-10">
        <div className="relative z-10 mx-auto max-w-5xl space-y-6">
          <button onClick={() => setActiveSubject(null)} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:text-blue-700">
            <FaArrowLeft /> Back to Recommendations
          </button>

          {!questions.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center shadow-[0_10px_40px_-15px_rgba(15,23,42,0.15)] backdrop-blur-xl">
              <h2 className="text-2xl font-black text-slate-950">No question pool available yet.</h2>
              <p className="mt-2 text-sm text-slate-500">No practice questions are available for this subject yet.</p>
            </div>
          ) : !results ? (
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <aside className="flex flex-row items-center gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_40px_-18px_rgba(15,23,42,0.2)] backdrop-blur-xl lg:sticky lg:top-6 lg:h-fit lg:flex-col lg:items-start lg:gap-5">
                <div className="relative mx-auto h-28 w-28 shrink-0 lg:mx-0">
                  <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                    <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="url(#drillRingGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                    <defs>
                      <linearGradient id="drillRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="font-mono text-lg font-black text-slate-900">{progressPercent}%</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 lg:w-full">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700"><FaBolt /> Focused Practice</p>
                  <h1 className="mt-1 truncate text-xl font-black text-slate-950">{activeSubject}</h1>
                  <span className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">Question {activeIndex + 1} of {questions.length}</span>
                </div>
              </aside>

              <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300 md:p-10">
                <span className="pointer-events-none absolute right-0 top-0 h-16 w-16 border-b border-l border-amber-300/60" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }} />
                <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-100/70 blur-3xl" />
                <div className="relative text-xl font-black leading-relaxed text-slate-900" dangerouslySetInnerHTML={{ __html: currentQuestion?.stem }} />
                <div className="relative mt-8">{currentQuestion && renderQuestionInput(currentQuestion, activeIndex)}</div>
                <button disabled={responses[activeIndex] === undefined || responses[activeIndex] === ""} onClick={() => activeIndex === questions.length - 1 ? submitDrill() : setActiveIndex((index) => index + 1)} className="relative mt-8 w-full rounded-2xl bg-blue-700 px-6 py-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40">{activeIndex === questions.length - 1 ? "Finish Drill" : "Next Question"}</button>
              </article>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-[0_20px_60px_-20px_rgba(15,23,42,0.2)] backdrop-blur-xl lg:sticky lg:top-6 lg:h-fit">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-100/70 to-transparent" />
                <div className="relative">
                  <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-amber-300 bg-amber-50 text-4xl text-amber-500 shadow-[0_0_35px_-6px_rgba(245,158,11,0.6)]">
                    <FaTrophy />
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full border border-amber-300/60" />
                  </span>
                  <p className="mt-4 font-mono text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600">Round Complete!</p>
                  <h2 className="mt-2 text-5xl font-black text-slate-950">{results.pct}%</h2>
                  <p className="mt-2 font-semibold text-slate-500">{results.correct} of {results.total} correct</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]"><p className="font-mono text-xs font-black uppercase tracking-wide text-amber-700">Best Streak</p><p className="mt-1 text-3xl font-black text-amber-900">{results.bestStreak}</p></div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]"><p className="font-mono text-xs font-black uppercase tracking-wide text-emerald-700">Points Earned</p><p className="mt-1 text-3xl font-black text-emerald-900">{results.points}</p></div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Answer Review</p>
                  <div className="mt-3 flex flex-wrap gap-2">{results.items.map((item, index) => <span key={index} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs font-black ${item.isCorrect ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>{item.isCorrect ? <FaCheckCircle /> : <FaTimesCircle />} {item.isCorrect ? "Correct" : "Incorrect"}</span>)}</div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => startDrill({ subject: activeSubject })} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow-[0_10px_25px_-10px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5"><FaRedo /> Try Again</button>
                  <button onClick={() => setActiveSubject(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 transition hover:border-slate-300">Back to Recommendations</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Recommended Practice Blocks</h1>
            <p className="mt-1 text-slate-500">Based on your lowest-performing mock exam subject categories.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-right font-mono text-xs font-black text-slate-500 backdrop-blur-xl">
            {rankedWeakSubjects.length} focus area{rankedWeakSubjects.length === 1 ? "" : "s"} · {sessions.length} logged session{sessions.length === 1 ? "" : "s"}
          </div>
        </header>

        <AdaptiveGatePanel gate={adaptiveGate} status={gateStatus} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
            {/* FIX: Ipinasa na ang adaptiveGate state para sumabay ang dynamic layout rendering */}
            <DiagnosticReport analysis={analysis} adaptiveGate={adaptiveGate} />
            {sessions.length > 0 && <PreviousDrillResults sessions={sessions} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {rankedWeakSubjects.map((subject) => (
              <article
                key={subject.subject}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white/90 p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(225,29,72,0.35)] ${
                  adaptiveGate?.focus_subject === subject.subject ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
                }`}
              >
                <span className="pointer-events-none absolute right-0 top-0 h-12 w-12 border-b border-l border-blue-200/0 transition-colors duration-300 group-hover:border-blue-300" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }} />
                <div className="flex items-start justify-between gap-3">
                  
                  {adaptiveGate?.focus_subject === subject.subject && <AIFocusBadge />}
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">{subject.subject}</h3>
                <p className="mt-1 flex-1 text-sm font-semibold text-slate-500">{getDrillDescription(subject, analysis)}</p>
                <div className="mt-4 flex items-center justify-between font-mono text-xs text-slate-500">
                  <span>Average: <span className="font-black text-slate-800">{safePercent(subject.averagePct)}%</span></span>
                  <span>10 Q · ~10 min</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${safePercent(subject.averagePct)}%` }} />
                </div>
                <button
                  onClick={() => startDrill(subject)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
                >
                  <FaPlay className="text-xs" /> Practice Now
                </button>
              </article>
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
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {question.choiceOpts.map((option, optionIndex) => (
            <button
              key={optionIndex}
              onClick={() => saveResponse(index, optionIndex)}
              disabled={Boolean(results)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all duration-200 ${
                responses[index] === optionIndex ? "border-rose-300 bg-rose-50 text-rose-700 shadow-[0_0_16px_-4px_rgba(225,29,72,0.4)]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40"
              } ${results ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-mono text-xs font-black">{String.fromCharCode(65 + optionIndex)}</span>
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
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all duration-200 ${
                  selected ? "border-rose-300 bg-rose-50 text-rose-700 shadow-[0_0_16px_-4px_rgba(225,29,72,0.4)]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-200 hover:bg-rose-50/40"
                } ${results ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-mono text-xs font-black">{selected ? "X" : ""}</span>
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
        className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
        placeholder="Type your answer..."
      />
    );
  }
}

function AIFocusBadge() {
  return (
    <span className="group relative inline-flex">
      <span tabIndex="0" className="cursor-help rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">AI Focus</span>
      <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold leading-5 text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">AI Focus: This subject has the highest priority for improvement based on your recent exam performance.</span>
    </span>
  );
}

// Keeps the diagnostic card aligned with the current AI target subject.
function DiagnosticReport({ analysis, adaptiveGate }) {
  const aiFocusSubject = adaptiveGate?.focus_subject;

  const diagnostic = useMemo(() => {
    if (!aiFocusSubject || !analysis.diagnosticInsights) return analysis.primaryDiagnostic;
    return analysis.diagnosticInsights.find(item => item.category === aiFocusSubject) || analysis.primaryDiagnostic;
  }, [analysis.primaryDiagnostic, analysis.diagnosticInsights, aiFocusSubject]);

  const narrative = buildDiagnosticNarrativeFromDiagnostic(analysis, diagnostic);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <span className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-rose-50 blur-3xl" />
      <p className="relative font-mono text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">Performance Diagnostic</p>
      <h2 className="relative mt-2 text-xl font-black leading-snug text-slate-950">{diagnostic ? getDiagnosticHeadline(diagnostic) : "Personalized insights unlock after your first mock."}</h2>
      {diagnostic && (
        <div className="relative mt-4 inline-flex flex-col rounded-xl border border-rose-200 bg-rose-50 px-4 py-2">
          <p className="font-mono text-[10px] font-black uppercase tracking-wide text-slate-400">Avg. Time</p>
          <p className="text-lg font-black text-rose-700">{formatAverageTime(diagnostic.averageSeconds)}</p>
        </div>
      )}
      <div className="relative mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-600">
        <p>{summarizeText(narrative, 180)}</p>
        {diagnostic && <ul className="list-disc space-y-1 pl-5 text-slate-700"><li>Practice {diagnostic.skillTag || diagnostic.subcategory || diagnostic.category} first.</li><li>Use a 10-question drill, then review every missed item.</li></ul>}
      </div>
      {diagnostic && (
        <div className="relative mt-5 flex flex-wrap gap-2">
          {diagnostic.path?.map((label) => (
            <span key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-black text-slate-500">{label}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function AdaptiveGatePanel({ gate, status }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-rose-100 bg-white/90 p-6 shadow-[0_10px_40px_-18px_rgba(15,23,42,0.15)] backdrop-blur-xl sm:p-8">
      <span className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-rose-50 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-amber-50 blur-3xl" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
            <FaRoute className="text-xl" />
            {status !== "idle" && <span className="absolute inset-0 animate-ping rounded-2xl border border-rose-300/70" />}
          </span>
          <div>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              {gate?.focus_subject ? `${gate.focus_subject} Priority Route` : "Building your route"}
            </h2>
          </div>
        </div>
     
      </div>

      {status === "loading" ? (
        <p className="relative mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <FaSpinner className="animate-spin text-rose-500" />
          Reading past diagnostics, fallback logs, and available drill pools.
        </p>
      ) : (
        <div className="relative mt-5 max-w-3xl space-y-2 text-sm font-semibold leading-6 text-slate-600">
          <p>{summarizeText(gate?.rationale || "Complete a mock exam to activate automatic drill routing.", 180)}</p>
          {gate?.focus_subject && <ul className="list-disc space-y-1 pl-5 text-slate-700"><li>Start with the {gate.focus_subject} practice block below.</li><li>Focus on accuracy before increasing speed.</li></ul>}
        </div>
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
  const safeSeconds = Number(seconds);
  if (!Number.isFinite(safeSeconds) || safeSeconds < 5) return "Building timing data";
  if (safeSeconds < 60) return `${Math.round(safeSeconds)}s`;
  return `${(safeSeconds / 60).toFixed(1)} min`;
}

function safePercent(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}

function summarizeText(text, limit) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit).replace(/\s+\S*$/, "")}…` : clean;
}

function getDrillDescription(subject, analysis) {
  const focus = analysis.diagnosticInsights?.find((item) => item.category === subject.subject);
  const skill = focus?.skillTag || focus?.subcategory;
  return skill ? `Practice ${skill} with targeted questions and answer review.` : "Build accuracy with a focused 10-question practice block.";
}

function PreviousDrillResults({ sessions }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-100 bg-white/90 p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">Previous Results</p>
      </div>
      <div className="mt-3 space-y-2">
        {sessions.slice(0, 5).map((session, index) => {
          const score = safePercent(session?.pct);
          const total = Number(session?.total);
          const correct = Number(session?.correct);
          return <div key={session?.id || `${session?.subject}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{session?.subject || "Practice drill"}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-slate-400">{Number.isFinite(correct) && Number.isFinite(total) && total > 0 ? `${correct}/${total} correct` : "Score recorded"} · {session?.completedAt ? new Date(session.completedAt).toLocaleDateString() : "Recent"}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 font-mono text-xs font-black ${score >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{score}%</span>
          </div>;
        })}
      </div>
    </section>
  );
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
