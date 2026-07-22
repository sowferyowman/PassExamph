import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaCheck, FaGraduationCap } from "react-icons/fa";
import { updateProfile } from "../api/authApi";
import { getCurrentUser, updateCurrentStudentProfile } from "../services/storage";

const examTargets = ["ACET", "UPCAT", "DCAT", "USTET", "General CET Prep"];

export default function StudentProfilingPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: currentUser?.name || "",
    nickname: currentUser?.nickname || "",
    target: currentUser?.academicMetrics?.target || "ACET",
    strengths: currentUser?.academicMetrics?.strengths?.join(", ") || "",
    weakTags: currentUser?.academicMetrics?.weakTags?.join(", ") || ""
  });
  const [error, setError] = useState("");

  const progress = useMemo(() => `${step + 1} of 3`, [step]);

  async function nextStep() {
    setError("");
    if (step === 0 && !form.name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    const profile = {
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      profileCompleted: true,
      academicMetrics: {
        target: form.target,
        strengths: splitTags(form.strengths),
        weakTags: splitTags(form.weakTags)
      }
    };
    updateCurrentStudentProfile({ ...profile, profileCompleted: true });
    try { await updateProfile(profile); } catch (reason) { setError(reason.response?.data?.error || "Could not save your profile."); return; }
    navigate("/dashboard", { replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <section className="glass-card w-full max-w-2xl p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-primary">
              <FaGraduationCap />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">Student Profiling</p>
              <h1 className="text-2xl font-black text-slate-950">Complete your student profile</h1>
            </div>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{progress}</span>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        <div className="mt-8">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Full Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Stanly Mejia" />
              <Field label="Nickname" value={form.nickname} onChange={(nickname) => setForm((current) => ({ ...current, nickname }))} placeholder="Stan" />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Target Exam Course</span>
                <select
                  value={form.target}
                  onChange={(event) => setForm((current) => ({ ...current, target: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {examTargets.map((target) => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Academic Strengths" value={form.strengths} onChange={(strengths) => setForm((current) => ({ ...current, strengths }))} placeholder="Algebra, Vocabulary, Abstract Reasoning" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field label="Academic Weaknesses" value={form.weakTags} onChange={(weakTags) => setForm((current) => ({ ...current, weakTags }))} placeholder="Geometry, Reading Inference, Time Pressure" />
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-slate-900">Profile Summary</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{form.nickname || form.name || "Student"} is preparing for {form.target}.</p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={step === 0}
          >
            Back
          </button>
          <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
            {step === 2 ? <FaCheck /> : <FaArrowRight />}
            {step === 2 ? "Finish Profile" : "Continue"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        placeholder={placeholder}
      />
    </label>
  );
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
