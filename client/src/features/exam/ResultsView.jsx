import { useEffect, useState } from "react";
import { FaArrowLeft, FaBrain, FaChartPie, FaSpinner, FaHourglassHalf, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { diagnoseExam } from "../../api/aiApi";
import { getCurrentUser, saveAiDiagnosticForLatestAttempt } from "../../services/storage";

export default function ResultsView({ results, onBack }) {
  const [aiDiagnostic, setAiDiagnostic] = useState(null);
  const [diagnosticStatus, setDiagnosticStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function loadDiagnostic() {
      if (!results) return;
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

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <FaArrowLeft /> Dashboard
        </button>

        <div className="glass-card p-8 text-center">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Mock Complete</p>
          {results?.hasEssays ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800"><FaHourglassHalf /> Pending Review</div>
          ) : <h1 className="mt-2 text-5xl font-black text-slate-950">{results?.finalPct ?? 0}%</h1>}
          {!results?.hasEssays && (
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${results?.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {results?.passed ? <FaCheckCircle /> : <FaTimesCircle />}
              {results?.passed ? "PASS" : "FAIL"} — Passing score: {results?.passingScore ?? 75}%
            </div>
          )}
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {results?.hasEssays ? `${results.essayCount || 1} essay question${results.essayCount === 1 ? "" : "s"} — Pending Review` : `${results?.correct ?? 0} / ${results?.total ?? 0} items correct`}
          </p>
          {!results?.hasEssays && <p className="mt-4 text-sm text-slate-600">AI target score after interventions: {results?.targetScore ?? 0}%</p>}
        </div>

        <section className="glass-card overflow-hidden">
          <div className="border-b border-violet-100 bg-violet-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-violet-600">Diagnostic Engine</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Post-Exam Diagnostics</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${
                diagnosticStatus === "ready"
                  ? "bg-emerald-100 text-emerald-700"
                  : diagnosticStatus === "fallback"
                    ? "bg-amber-100 text-amber-700"
                    : diagnosticStatus === "error"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-violet-100 text-violet-700"
              }`}>
                {diagnosticStatus === "loading" ? "Analyzing" : diagnosticStatus === "fallback" ? "Local Backup" : diagnosticStatus === "error" ? "Unavailable" : "AI Ready"}
              </span>
            </div>
          </div>

          <div className="p-5">
            {diagnosticStatus === "loading" && (
              <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm font-bold text-violet-700">
                <FaSpinner className="animate-spin" />
                Groq is analyzing score, topic mastery, skipped items, mistake clusters, and time logs.
              </div>
            )}

            {aiDiagnostic && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Performance Score</p>
                    <p className="mt-2 text-3xl font-black text-violet-700">{results?.hasEssays ? "Pending" : `${aiDiagnostic.percentage_score}%`}</p>
                  </div>
                  {(aiDiagnostic.subject_mastery || []).slice(0, 2).map((subject) => (
                    <div key={subject.subject} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{subject.subject}</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{subject.mastery_percentage}%</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{subject.observed_issue}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
                  <div className="mb-3 flex items-center gap-2 text-violet-700">
                    <FaChartPie />
                    <h3 className="font-black">Personalized Weakness Explanation</h3>
                  </div>
                  <p className="text-sm font-semibold leading-7 text-slate-700">{aiDiagnostic.weakness_paragraph}</p>
                </div>
              </div>
            )}

            {diagnosticStatus === "error" && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                AI diagnostics could not be loaded. Your scored result was still saved.
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {results?.subjectScores?.map((subject) => (
            <div key={subject.title} className="glass-card p-5">
              <div className="mb-2 flex items-end justify-between">
                <h3 className="font-black text-slate-800">{subject.title}</h3>
                <span className="text-sm font-black text-slate-500">{subject.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${subject.pct >= 80 ? "bg-emerald-500" : subject.pct < 70 ? "bg-rose-500" : "bg-blue-600"}`} style={{ width: `${subject.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-950">AI Generated Drills</h2>
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
                  <button className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Start 5-Min Drill</button>
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
