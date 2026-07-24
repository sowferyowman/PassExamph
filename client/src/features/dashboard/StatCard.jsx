const accents = {
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
  teal: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export default function StatCard({ stat, index = 0 }) {
  const accent = accents[stat.accent] || accents.blue;
  const progress = Number.isFinite(Number(stat.progress)) ? Math.max(0, Math.min(100, Number(stat.progress))) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
      className={`rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}
    >
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{stat.label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{stat.value}</p>
      {progress !== null && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/80">
            <motion.div
              className="h-full rounded-full bg-current"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.08 }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-bold text-slate-600">{stat.progressLabel || `${progress}% complete`}</p>
        </div>
      )}
      <p className="mt-3 inline-flex rounded-lg bg-white/75 px-3 py-1.5 text-xs font-bold">
        {stat.detail}
      </p>
    </motion.div>
  );
}
import { motion } from "framer-motion";
