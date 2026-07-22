import { useMemo, useState } from "react";
import { FaCheckCircle, FaClipboardCheck, FaHourglassHalf, FaUsers } from "react-icons/fa";
import AdminSidebar from "../components/AdminSidebar";
import { getDashboardStore, getEssayResponses, getUserAccounts, updateLatestEssayReview } from "../services/storage";

export default function AdminReviewDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [scores, setScores] = useState({});
  const students = useMemo(() => getUserAccounts().filter((user) => user.role === "student"), [refresh]);
  const pending = useMemo(() => {
    const store = getDashboardStore();
    return students.flatMap((student) => (store[student.email]?.attempts || []).flatMap((attempt) => getEssayResponses(attempt).filter((essay) => ["pending_review", "ai_graded"].includes(essay.status)).map((essay) => ({ ...essay, email: student.email, studentName: student.name || student.email, examTitle: attempt.examTitle || "Essay Exam" }))));
  }, [students, refresh]);

  function approve(item) {
    const maxPoints = Math.max(1, Number(item.points || 1));
    const score = Number(scores[item.id] ?? item.aiScore);
    
    // Validate
    if (!Number.isFinite(score)) {
      alert("Please enter a valid score.");
      return;
    }
    
    if (score < 0 || score > maxPoints) {
      alert(`Score must be between 0 and ${maxPoints}.`);
      return;
    }
    
    updateLatestEssayReview(item.email, item.id, { 
      finalScore: score, 
      status: "approved" 
    });
    setRefresh((value) => value + 1);
  }

  function reject(item) {
    updateLatestEssayReview(item.email, item.id, { 
      aiScore: null, 
      finalScore: null, 
      status: "pending_review" 
    });
    setRefresh((value) => value + 1);
  }

  return (
    <main className="flex h-screen overflow-hidden bg-slate-100">
      <AdminSidebar active="dashboard" />
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <header>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Admin Dashboard</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Review Center</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Approve AI essay scores and monitor student accounts.</p>
          </header>

          <section className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
              <FaHourglassHalf className="text-amber-500" />
              <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">Pending Essays</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{pending.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <FaClipboardCheck className="text-blue-600" />
              <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">Students</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{students.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <FaCheckCircle className="text-emerald-600" />
              <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">Workflow</p>
              <p className="mt-1 text-sm font-black text-emerald-700">AI score → Admin approval</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-xl font-black text-slate-950">Pending Essay Reviews</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pending.length ? pending.map((item) => {
                const maxPoints = Math.max(1, Number(item.points || 1));
                return (
                  <article key={`${item.email}-${item.id}`} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-blue-600">{item.examTitle}</p>
                        <h3 className="mt-1 font-black text-slate-900">{item.studentName}</h3>
                        <p className="mt-1 text-sm text-slate-600">{item.response || "No response submitted."}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-400">Rubric: {item.rubric || "Default criteria"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">Max Points: {maxPoints}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            min="0" 
                            max={maxPoints}
                            step="0.5" 
                            value={scores[item.id] ?? item.aiScore ?? ""} 
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === "") { setScores((current) => ({ ...current, [item.id]: "" })); return; }
                              const numeric = Math.max(0, Math.min(maxPoints, Number(value)));
                              setScores((current) => ({ ...current, [item.id]: Number.isFinite(numeric) ? numeric : "" }));
                            }} 
                            placeholder="Score" 
                            className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold" 
                          />
                          <span className="text-xs font-semibold text-slate-400">/ {maxPoints}</span>
                        </div>
                        <button 
                          onClick={() => approve(item)} 
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => reject(item)} 
                          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }) : (
                <p className="p-8 text-center text-sm font-semibold text-slate-500">No essay submissions are waiting for review.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <FaUsers className="text-blue-600" />
              <h2 className="text-xl font-black text-slate-950">All Students</h2>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">
              {students.length ? students.map((student) => (
                <div key={student.id || student.email} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-black text-slate-900">{student.name || "Student"}</p>
                  <p className="mt-1 text-sm text-slate-500">{student.email}</p>
                </div>
              )) : (
                <p className="text-sm font-semibold text-slate-500">No student accounts found.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
