import { motion } from "framer-motion";

const verdicts = [
  { label: "Needs work", range: "0–49", color: "bg-rose-500", text: "text-rose-700" },
  { label: "Developing", range: "50–64", color: "bg-orange-400", text: "text-orange-700" },
  { label: "On track", range: "65–74", color: "bg-amber-400", text: "text-amber-700" },
  { label: "Strong", range: "75–84", color: "bg-sky-500", text: "text-sky-700" },
  { label: "Excellent", range: "85–100", color: "bg-emerald-500", text: "text-emerald-700" }
];

function getVerdict(score) {
  if (score < 50) return verdicts[0];
  if (score < 65) return verdicts[1];
  if (score < 75) return verdicts[2];
  if (score < 85) return verdicts[3];
  return verdicts[4];
}

export default function OverallScoreGauge({ score, examCount }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const verdict = getVerdict(safeScore);
  const circumference = 2 * Math.PI * 52;
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-800">Overall Average Score</h3><p className="mt-1 text-xs font-semibold text-slate-500">Across {examCount} completed mock exam{examCount === 1 ? "" : "s"}</p></div><span className={`rounded-full bg-slate-50 px-3 py-1 text-xs font-black ${verdict.text}`}>{verdict.label}</span></div>
    <div className="mt-4 flex justify-center"><div className="relative h-44 w-44"><svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-label={`Overall score: ${safeScore}% — ${verdict.label}`}><circle cx="64" cy="64" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" /><motion.circle cx="64" cy="64" r="52" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className={verdict.text} strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - safeScore / 100) }} transition={{ duration: 1.5, ease: "easeOut" }} /></svg><div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-4xl font-black text-slate-900">{safeScore}%</p><p className={`mt-1 text-xs font-black ${verdict.text}`}>{verdict.label}</p></div></div></div></div>
    <div className="mt-4 grid grid-cols-5 gap-1" aria-label="Score verdict scale">{verdicts.map((item) => <div key={item.label} className="text-center"><span className={`mx-auto block h-2 w-full rounded-full ${item.color} ${item.label === verdict.label ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-35"}`} /><p className="mt-2 text-[9px] font-black leading-tight text-slate-600">{item.label}</p><p className="text-[9px] font-semibold text-slate-400">{item.range}</p></div>)}</div>
  </div>;
}
