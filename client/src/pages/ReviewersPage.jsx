import { useEffect, useRef, useState } from "react";
import { BlockMath, InlineMath } from "react-katex";
import katex from "katex";
import "katex/dist/katex.min.css";
import { FaArrowLeft, FaBookOpen, FaCheckCircle, FaChevronLeft, FaClock, FaExternalLinkAlt, FaFileAlt, FaPlayCircle } from "react-icons/fa";
import { getCurrentUser, getReviewerBlueprints, getReviewerProgress, setReviewerModuleCompletion } from "../services/storage";

const RESUME_KEY = "acetReviewerResume";

function readResume(email) {
  try { return JSON.parse(localStorage.getItem(`${RESUME_KEY}:${email}`) || "{}"); } catch { return {}; }
}

function statusFor(module, completed, resume) {
  if (completed) return { label: "Done", icon: "✓", tone: "text-emerald-700 bg-emerald-100" };
  if (resume?.scrollTop > 0) return { label: "In Progress", icon: "▶", tone: "text-blue-700 bg-blue-100" };
  return { label: "Not Started", icon: "○", tone: "text-slate-600 bg-slate-100" };
}

function MathContent({ content }) {
  const html = String(content || "").replace(/<p><br><\/p>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!html) return <p className="italic text-slate-500">No content available for this module.</p>;
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return <div className="prose max-w-none text-slate-700">{html.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g).map((part, index) => {
      if (part.startsWith("$$")) return <BlockMath key={index} math={part.slice(2, -2)} />;
      if (part.startsWith("$")) return <InlineMath key={index} math={part.slice(1, -1)} />;
      return part;
    })}</div>;
  }
  const mathHtml = html
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }))
    .replace(/\$([^$\n]+)\$/g, (_, math) => katex.renderToString(math.trim(), { displayMode: false, throwOnError: false }));
  return <div className="reviewer-content prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: mathHtml }} />;
}

function getVideoId(url) {
  const match = String(url || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&/]+)/);
  return match?.[1] || null;
}

export default function ReviewersPage() {
  const user = getCurrentUser();
  const reviewers = getReviewerBlueprints();
  const [progress, setProgress] = useState(() => getReviewerProgress(user?.email));
  const [resume, setResume] = useState(() => readResume(user?.email));
  const [selectedReviewerId, setSelectedReviewerId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const contentRef = useRef(null);

  const reviewer = reviewers.find((item) => item.id === selectedReviewerId);
  const modules = reviewer?.modules || [];
  const activeModule = modules.find((module) => module.id === selectedModuleId) || modules[0];
  const completedIds = progress[reviewer?.id] || [];
  const completedCount = modules.filter((module) => completedIds.includes(module.id)).length;
  const courseProgress = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;

  function updateResume(moduleId, patch) {
    if (!reviewer) return;
    const key = `${reviewer.id}:${moduleId}`;
    const next = { ...resume, [key]: { ...resume[key], ...patch, updatedAt: new Date().toISOString() } };
    setResume(next);
    localStorage.setItem(`${RESUME_KEY}:${user?.email}`, JSON.stringify(next));
  }

  function openReviewer(item) {
    const firstIncomplete = item.modules?.find((module) => !(progress[item.id] || []).includes(module.id));
    setSelectedReviewerId(item.id);
    setSelectedModuleId(firstIncomplete?.id || item.modules?.[0]?.id || null);
  }

  function selectModule(moduleId) {
    setSelectedModuleId(moduleId);
    setMobileOutlineOpen(false);
  }

  function toggleComplete(moduleId) {
    const complete = completedIds.includes(moduleId);
    setProgress(setReviewerModuleCompletion(user.email, reviewer.id, moduleId, !complete));
  }

  useEffect(() => {
    if (!activeModule || !contentRef.current) return undefined;
    const saved = resume[`${reviewer.id}:${activeModule.id}`];
    const timer = window.setTimeout(() => { if (saved?.scrollTop) contentRef.current.scrollTop = saved.scrollTop; }, 0);
    return () => window.clearTimeout(timer);
  }, [activeModule?.id, reviewer?.id]);

  if (!reviewers.length) return <EmptyState />;

  if (!reviewer || !activeModule) {
    return <div className="min-h-screen bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-6xl">
      <header className="mb-8"><p className="text-xs font-black uppercase tracking-wider text-blue-600">Learning Path</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Choose your reviewer</h1><p className="mt-2 text-sm font-semibold text-slate-500">Structured lessons, clear progress, and a saved place to resume.</p></header>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{reviewers.map((item) => {
        const done = progress[item.id] || [];
        const total = item.modules?.length || 0;
        const percent = total ? Math.round((done.length / total) * 100) : 0;
        const minutes = (item.modules || []).reduce((sum, module) => sum + (Number(module.estimatedMinutes) || 15), 0);
        const hasResume = (item.modules || []).some((module) => resume[`${item.id}:${module.id}`]?.scrollTop > 0 && !done.includes(module.id));
        return <button key={item.id} type="button" onClick={() => openReviewer(item)} className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
          <div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><FaBookOpen /></span>{hasResume && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">Resume</span>}</div>
          <p className="mt-5 text-xs font-black uppercase tracking-wider text-blue-600">{item.subjectCategory || "General"}</p><h2 className="mt-1 text-xl font-black text-slate-900">{item.title || "Untitled Reviewer"}</h2>
          <div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-500"><span>{done.length}/{total} lessons</span><span className="inline-flex items-center gap-1"><FaClock /> {minutes} min</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs font-black text-slate-700">{percent}% complete</p>
        </button>;
      })}</div>
    </div></div>;
  }

  const activeResume = resume[`${reviewer.id}:${activeModule.id}`];
  const activeCompleted = completedIds.includes(activeModule.id);
  const videoId = getVideoId(activeModule.videoUrl);
  const activeIndex = modules.findIndex((module) => module.id === activeModule.id);
  const navigateModule = (direction) => selectModule(modules[activeIndex + direction]?.id || activeModule.id);

  const outline = <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50 p-4 lg:w-80 lg:border-b-0 lg:border-r lg:overflow-y-auto">
    <button type="button" onClick={() => { setSelectedReviewerId(null); setSelectedModuleId(null); }} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><FaArrowLeft /> All reviewers</button>
    <p className="text-xs font-black uppercase tracking-wider text-blue-600">{reviewer.subjectCategory || "Learning Path"}</p><h1 className="mt-1 text-xl font-black text-slate-900">{reviewer.title}</h1>
    <div className="mt-5"><div className="flex justify-between text-xs font-bold text-slate-600"><span>Course progress</span><span>{courseProgress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${courseProgress}%` }} /></div></div>
    <nav className="mt-6 space-y-2">{modules.map((module, index) => {
      const completed = completedIds.includes(module.id); const itemResume = resume[`${reviewer.id}:${module.id}`]; const status = statusFor(module, completed, itemResume); const selected = module.id === activeModule.id;
      return <button type="button" key={module.id} onClick={() => selectModule(module.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-blue-300 bg-blue-50 shadow-sm" : "border-transparent hover:bg-white"}`}>
        <div className="flex items-start gap-3"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${status.tone}`}>{status.icon}</span><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-400">Lesson {index + 1} · {Number(module.estimatedMinutes) || 15} min</p><p className="mt-0.5 text-sm font-black text-slate-800">{module.title || `Module ${index + 1}`}</p>{module.description && <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{module.description}</p>}<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${completed ? 100 : itemResume?.readProgress || 0}%` }} /></div></div></div>
      </button>;
    })}</nav>
  </aside>;

  return <div className="min-h-screen bg-slate-100 p-0 sm:p-6"><div className="mx-auto max-w-7xl overflow-hidden bg-white shadow-sm sm:rounded-2xl lg:flex lg:min-h-[calc(100vh-3rem)]">
    <div className="hidden lg:block">{outline}</div>
    <div className="border-b border-slate-200 p-4 lg:hidden"><button type="button" onClick={() => setMobileOutlineOpen((open) => !open)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-black text-slate-800">{mobileOutlineOpen ? "Hide course outline" : "Show course outline"}</button>{mobileOutlineOpen && <div className="mt-3">{outline}</div>}</div>
    <main ref={contentRef} onScroll={(event) => { const element = event.currentTarget; updateResume(activeModule.id, { scrollTop: element.scrollTop, readProgress: Math.round((element.scrollTop / Math.max(1, element.scrollHeight - element.clientHeight)) * 100) }); }} className="min-w-0 flex-1 p-5 sm:p-8 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div className="mx-auto max-w-3xl"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wider text-blue-600">Lesson {activeIndex + 1} of {modules.length}</p><span className={`rounded-full px-3 py-1 text-xs font-black ${statusFor(activeModule, activeCompleted, activeResume).tone}`}>{statusFor(activeModule, activeCompleted, activeResume).label}</span></div>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{activeModule.title || `Module ${activeIndex + 1}`}</h2>{activeModule.description && <p className="mt-3 text-base font-semibold text-slate-600">{activeModule.description}</p>}
      {activeResume?.scrollTop > 0 && !activeCompleted && <button type="button" onClick={() => { contentRef.current.scrollTop = activeResume.scrollTop; }} className="mt-5 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-black text-amber-900">Resume reading</button>}
      {videoId && <section className="mt-7"><p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><FaPlayCircle /> Watch first</p><div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-md"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={activeModule.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>}
      <section className="mt-8 border-t border-slate-100 pt-8"><div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800"><FaFileAlt className="text-blue-600" /> Lesson content</div><MathContent content={activeModule.content} /></section>
      <footer className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2"><button type="button" disabled={!activeIndex} onClick={() => navigateModule(-1)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black disabled:opacity-40"><FaChevronLeft /></button><button type="button" disabled={activeIndex === modules.length - 1} onClick={() => navigateModule(1)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black disabled:opacity-40">Next lesson</button></div><button type="button" onClick={() => toggleComplete(activeModule.id)} className={`min-h-11 rounded-xl px-5 text-sm font-black ${activeCompleted ? "bg-emerald-100 text-emerald-800" : "bg-blue-600 text-white hover:bg-blue-700"}`}>{activeCompleted ? "✓ Completed" : "Mark complete"}</button></footer>
      </div>
    </main>
  </div><style>{`.reviewer-content table{width:100%;border:1px solid #e2e8f0;border-radius:.75rem;overflow:hidden}.reviewer-content th{position:sticky;top:0;background:#f8fafc;color:#334155}.reviewer-content th,.reviewer-content td{padding:.75rem;border-bottom:1px solid #f1f5f9}.reviewer-content tbody tr:nth-child(even){background:#f8fafc}.reviewer-content tbody tr:hover{background:#eff6ff}`}</style></div>;
}

function EmptyState() { return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto grid max-w-2xl place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"><FaBookOpen className="text-4xl text-slate-300" /><h1 className="mt-4 text-2xl font-black text-slate-900">No reviewers published yet</h1><p className="mt-2 text-sm font-semibold text-slate-500">Learning paths will appear here when an admin publishes them.</p></div></div>; }
