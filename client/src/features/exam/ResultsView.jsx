import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaBrain, FaSpinner, FaHourglassHalf, FaCheckCircle, FaTimesCircle, FaLightbulb, FaRoute, FaQuoteLeft } from "react-icons/fa";
import { diagnoseExam } from "../../api/aiApi";
import { getCurrentUser, saveAiDiagnosticForLatestAttempt } from "../../services/storage";

// aiApi responses emit **word** to mark the phrase that should be visually
// emphasized — this is a real contract between the prompts (aiDiagnostics.js)
// and the UI, not decoration. Splitting on the marker and rendering
// <strong> keeps it safe (no HTML from the model ever touches the DOM)
// while still giving the coaching text real typographic hierarchy.
function RichText({ text, boldClassName = "font-black text-slate-900" }) {
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

// hex/soft added alongside the existing Tailwind classes — the ring needs a
// real color value (SVG stroke can't resolve a Tailwind class), everything
// else keeps using the class-based tokens as before.
const TIERS = {
  strength: { label: "Strength", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500", accent: "text-emerald-700", hex: "#10b981" },
  developing: { label: "Developing", badge: "bg-blue-100 text-blue-700", bar: "bg-blue-600", accent: "text-blue-700", hex: "#2563eb" },
  priority: { label: "Priority", badge: "bg-rose-100 text-rose-700", bar: "bg-rose-500", accent: "text-rose-700", hex: "#f43f5e" }
};

function getTier(pct) {
  if (pct >= 80) return TIERS.strength;
  if (pct >= 65) return TIERS.developing;
  return TIERS.priority;
}

// A circular progress ring — used for both the hero score and each subject,
// so a "76%" reads as a filled arc instead of a bar eating horizontal
// space. Children render upright and centered; only the SVG itself is
// rotated so the arc starts at 12 o'clock.
function CircularProgress({ pct, size, strokeWidth, color, trackColor = "#e2e8f0", active = true, duration = 1100, delay = 0, children }) {
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

// diagnoseExam now returns a full, natural, second-person sentence for each
// subject's observed_issue (see aiApi.js), so there's no more label-to-sentence
// rewriting to do here. This just tidies up punctuation/casing as a safety
// net — for example if a stale cached diagnostic from before that prompt
// change is still sitting in local storage.
function formatIssue(issue) {
  if (!issue) return null;
  let trimmed = issue.trim();
  if (!trimmed) return null;
  // Fix ALL-CAPS-STYLE or Title Case leftovers without flattening real
  // sentence-case text (i.e. don't touch normal mixed-case sentences).
  const looksLikeLabel = trimmed === trimmed.toUpperCase() || /^([A-Z][a-z]*\s+){2,}[A-Z][a-z]*$/.test(trimmed);
  if (looksLikeLabel) {
    trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  if (!/[.!?]$/.test(trimmed)) trimmed += ".";
  return trimmed;
}

function buildTakeaway(subjectScores) {
  if (!subjectScores || subjectScores.length < 2) return null;
  const sorted = [...subjectScores].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best.title === worst.title || best.pct === worst.pct) return null;
  return `Strongest in ${best.title} (${best.pct}%), needs the most work in ${worst.title} (${worst.pct}%).`;
}

// Counts a number up from 0 to `target` once `active` flips true. Purely
// cosmetic — falls back to the plain target value until then.
function useCountUp(target, active, duration = 1100) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, active, duration]);
  return value;
}

// Fills the space beside the hero ring with something the student actually
// wants to know, instead of empty white space. Hidden on small screens
// where three columns would get cramped — the ring stays the priority.
function HeroStat({ icon, value, label, tone }) {
  return (
    <div className="hidden flex-col items-center justify-center gap-1 sm:flex">
      <span className={`text-2xl ${tone}`}>{icon}</span>
      <span className="text-3xl font-black tabular-nums text-slate-900">{value}</span>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}

export default function ResultsView({ results, onBack }) {
  const navigate = useNavigate();
  const [aiDiagnostic, setAiDiagnostic] = useState(null);
  const [diagnosticStatus, setDiagnosticStatus] = useState("loading");
  const [mounted, setMounted] = useState(false);

  // Small delay so the ring/count-up visibly animate in on load rather than
  // snapping to their final state before paint.
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDiagnostic() {
      if (!results) return;
      if (results.hasEssays || results.status === "Pending Review") {
        setAiDiagnostic(null);
        setDiagnosticStatus("idle");
        return;
      }
      try {
        setDiagnosticStatus("loading");
        const diagnostic = await diagnoseExam({
          rawScore: results.correct,
          totalItems: results.total,
          percentageScore: results.finalPct,
          subjectBreakdown: results.subjectScores || [],
          fallbackLogs: results.itemDiagnostics || [],
          finishedAt: new Date().toISOString()
        });

        if (!mounted) return;
        setAiDiagnostic(diagnostic);
        setDiagnosticStatus(diagnostic.source === "local_fallback" ? "fallback" : "ready");

        const user = getCurrentUser();
        if (user?.email) saveAiDiagnosticForLatestAttempt(user.email, diagnostic);
      } catch (error) {
        console.error("Post-exam AI diagnostic failed:", error);
        if (mounted) setDiagnosticStatus("error");
      }
    }

    loadDiagnostic();

    return () => {
      mounted = false;
    };
  }, [results]);

  const subjectRows = useMemo(() => {
    return (results?.subjectScores || []).map((subject) => {
      const mastery = (aiDiagnostic?.subject_mastery || []).find(
        (m) => m.subject?.toLowerCase().trim() === subject.title?.toLowerCase().trim()
      );
      return {
        title: subject.title,
        pct: subject.pct,
        tier: getTier(subject.pct),
        issue: mastery ? formatIssue(mastery.observed_issue) : null,
        actionTip: mastery?.action_tip || null
      };
    });
  }, [results, aiDiagnostic]);

  // Instant, client-side takeaway shown the moment results load — before the
  // AI headline arrives — so the page never sits there with nothing to say.
  // Once aiDiagnostic.headline is in, it takes over as the richer version.
  const takeaway = useMemo(() => buildTakeaway(results?.subjectScores), [results]);

  const scoreTier = getTier(results?.finalPct ?? 0);
  const animatedScore = useCountUp(results?.finalPct ?? 0, mounted && !results?.hasEssays, 1300);
  const pendingReview = Boolean(results?.hasEssays || results?.status === "Pending Review");

  if (pendingReview) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><FaArrowLeft /> Dashboard</button>
          <section className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-amber-300 bg-amber-50"><FaHourglassHalf className="text-2xl text-amber-500" /></div>
            <h1 className="mt-5 text-2xl font-black text-slate-900">Essay review pending</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Your essay response is awaiting review. Your final score, pass/fail result, and recommendations will appear only after an administrator completes the review.</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <FaArrowLeft /> Dashboard
        </button>

        {/* Hero — score ring flanked by correct/incorrect stat blocks instead of
            sitting alone in a wide centered card, so the space on either side
            of the ring is doing something instead of sitting empty. */}
        <div className="glass-card overflow-hidden">
          <p className="pt-8 text-center text-xs font-black uppercase tracking-wider text-blue-600">Mock Complete</p>

          {results?.hasEssays ? (
            <div className="flex flex-col items-center gap-3 px-8 pb-10 pt-6">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-amber-300 bg-amber-50">
                <FaHourglassHalf className="text-2xl text-amber-500" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
                Pending Review
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {results.essayCount || 1} essay question{results.essayCount === 1 ? "" : "s"} — Pending Review
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-2 px-4 pb-8 pt-6 sm:grid-cols-3 sm:px-8">
              <HeroStat
                icon={<FaCheckCircle />}
                value={results?.correct ?? 0}
                label="Correct"
                tone="text-emerald-600"
              />

              <div className="flex flex-col items-center">
                <CircularProgress pct={results?.finalPct ?? 0} size={148} strokeWidth={11} color={scoreTier.hex} active={mounted} duration={1300}>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black tabular-nums text-slate-950">{animatedScore}%</span>
                    <span className={`mt-1 text-[10px] font-black uppercase tracking-wider ${scoreTier.accent}`}>{scoreTier.label}</span>
                  </div>
                </CircularProgress>

                <div
                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition-opacity duration-700 ${
                    mounted ? "opacity-100" : "opacity-0"
                  } ${results?.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
                >
                  {results?.passed ? <FaCheckCircle /> : <FaTimesCircle />}
                  {results?.passed ? "PASS" : "FAIL"}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-400">Passing score: {results?.passingScore ?? 75}%</p>
              </div>

              <HeroStat
                icon={<FaTimesCircle />}
                value={(results?.total ?? 0) - (results?.correct ?? 0)}
                label="Incorrect"
                tone="text-rose-500"
              />
            </div>
          )}

          {!results?.hasEssays && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-8 py-3 text-center">
              <p className="text-sm font-semibold text-slate-500">
                {results?.correct ?? 0} / {results?.total ?? 0} items correct
                {results?.targetScore != null && <span className="text-slate-400"> · Aim for {results.targetScore}% on your next attempt.</span>}
              </p>
            </div>
          )}
        </div>

        {/* Coaching headline — instant client-side takeaway first, AI headline replaces it once ready */}
        <div className="overflow-hidden rounded-2xl border-l-4 border-violet-500 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <FaQuoteLeft className="mt-1 shrink-0 text-violet-300" />
            <div className="min-w-0">
              <p className="text-lg font-bold leading-snug text-slate-900">
                {aiDiagnostic?.headline ? <RichText text={aiDiagnostic.headline} boldClassName="font-black text-violet-700" /> : (takeaway || "Nice work finishing the mock exam.")}
              </p>
              {aiDiagnostic?.performance_summary && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <RichText text={aiDiagnostic.performance_summary} boldClassName="font-bold text-slate-800" />
                </p>
              )}
              {diagnosticStatus === "loading" && (
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <FaSpinner className="animate-spin" /> Your coach is reviewing the details...
                </div>
              )}
              {diagnosticStatus === "error" && (
                <p className="mt-2 text-xs font-bold text-rose-600">Personalized coaching isn't available right now. Your score was still saved.</p>
              )}
            </div>
          </div>
        </div>

        {/* Subject breakdown — compact ring grid instead of full-width bars, so each subject is a small
            self-contained card rather than a row that eats the full width of the page */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-900">Your Results by Subject</h2>
          </div>

          <div className="p-5">
            {!!subjectRows.length && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {subjectRows.map((subject, i) => (
                  <div key={subject.title} className="flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                    <CircularProgress pct={subject.pct} size={104} strokeWidth={9} color={subject.tier.hex} active={mounted} duration={900} delay={150 + i * 100}>
                      <span className={`text-xl font-black tabular-nums ${subject.tier.accent}`}>{subject.pct}%</span>
                    </CircularProgress>

                    <h3 className="mt-3 text-sm font-bold text-slate-800">{subject.title}</h3>
                    <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${subject.tier.badge}`}>
                      {subject.tier.label}
                    </span>

                    {subject.issue && (
                      <p
                        className="mt-2 text-xs leading-5 text-slate-500"
                        style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        <RichText text={subject.issue} boldClassName="font-bold text-slate-700" />
                      </p>
                    )}

                    {subject.actionTip && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-left">
                        <FaLightbulb className="mt-0.5 shrink-0 text-amber-500" size={11} />
                        <p className="text-xs font-semibold text-amber-800">{subject.actionTip}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {diagnosticStatus === "loading" && !subjectRows.some((s) => s.issue) && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FaSpinner className="animate-spin" /> Personalizing your feedback...
              </div>
            )}
          </div>
        </section>

        {/* Study plan — the AI's prioritized next steps, ordered highest-impact first */}
        {!!aiDiagnostic?.study_plan?.length && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center gap-2">
                <FaRoute className="text-blue-600" />
                <h2 className="text-lg font-black text-slate-900">Your Study Plan</h2>
              </div>
            </div>
            <div className="p-5">
              <ol className="space-y-4">
                {aiDiagnostic.study_plan.map((step, i) => (
                  <li key={`${step.title}-${i}`} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{step.title}</h3>
                      {step.description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {aiDiagnostic?.encouragement && (
          <p className="px-1 text-center text-sm font-semibold italic text-slate-500">
            "<RichText text={aiDiagnostic.encouragement} boldClassName="not-italic font-black text-slate-700" />"
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-950">Recommended Drills</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {results?.weaknesses?.length ? (
              results.weaknesses.map((weakness) => (
                <div key={weakness.title} className="glass-card border-rose-100 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <FaBrain className="text-rose-500" />
                    <h3 className="font-black text-slate-800">{weakness.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500">
                    Focus required on <strong className="text-slate-700">{weakness.topicFocus}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/weakness-drills", { state: { focusSubject: weakness.title, questionLimit: 5 } })}
                    className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Start 5-Min Drill
                  </button>
                </div>
              ))
            ) : (
              <div className="glass-card bg-emerald-600 p-6 text-white md:col-span-2">
                <h3 className="text-xl font-black">Exceptional Performance</h3>
                <p className="mt-2 text-sm text-emerald-50">You scored above 80% in all subjects. An advanced challenge set is ready.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
