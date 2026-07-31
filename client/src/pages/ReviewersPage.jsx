import { useEffect, useRef, useState } from "react";
import { BlockMath, InlineMath } from "react-katex";
import katex from "katex";
import "katex/dist/katex.min.css";
import { FaArrowLeft, FaBookOpen, FaChevronLeft, FaClock, FaFileAlt, FaPlayCircle } from "react-icons/fa";
import { getCurrentUser, getReviewerBlueprints, getReviewerProgress, setReviewerModuleCompletion } from "../services/storage";

const RESUME_KEY = "acetReviewerResume";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .rp-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; }
      .rp-progress-track { background: #e5e7eb; border-radius: 999px; overflow: hidden; }
      .rp-progress-fill { background: #2563eb; border-radius: 999px; transition: width 0.4s ease; }

      .rp-btn-primary { background: #2563eb; color: #fff; border-radius: 8px; transition: background 0.15s ease; }
      .rp-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
      .rp-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

      .rp-btn-secondary { background: transparent; border: 1px solid #e5e7eb; color: #111827; border-radius: 8px; transition: border-color 0.15s ease, background 0.15s ease; }
      .rp-btn-secondary:hover:not(:disabled) { border-color: #d1d5db; background: #fafafa; }
      .rp-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

      .rp-focus-ring:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }

      .rp-module-row { border-radius: 8px; transition: background 0.15s ease, border-color 0.15s ease; }
      .rp-module-row.is-active { border-color: #93c5fd; background: #eff4ff; }
      .rp-module-row:hover:not(.is-active) { background: #f3f4f6; }

      .reviewer-content table{width:100%;border:1px solid #e5e7eb;border-radius:.5rem;overflow:hidden}
      .reviewer-content th{position:sticky;top:0;background:#f9fafb;color:#374151}
      .reviewer-content th,.reviewer-content td{padding:.75rem;border-bottom:1px solid #f1f5f9}
      .reviewer-content tbody tr:nth-child(even){background:#f9fafb}
      .reviewer-content tbody tr:hover{background:#eff4ff}
    `}</style>
  );
}

function readResume(email) {
  try { return JSON.parse(localStorage.getItem(`${RESUME_KEY}:${email}`) || "{}"); } catch { return {}; }
}

function statusFor(module, completed, resume) {
  if (completed) return { label: "Done", icon: "✓", tone: "text-emerald-700 bg-emerald-50" };
  if (resume?.scrollTop > 0) return { label: "In Progress", icon: "▶", tone: "text-blue-700 bg-blue-50" };
  return { label: "Not Started", icon: "○", tone: "text-gray-500 bg-gray-100" };
}

function MathContent({ content }) {
  const html = String(content || "").replace(/<p><br><\/p>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!html) return <p className="italic text-gray-500">No content available for this module.</p>;
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return <div className="prose max-w-none text-gray-700">{html.split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g).map((part, index) => {
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

  // ── Reviewer catalog ─────────────────────────────────────────────────
  if (!reviewer || !activeModule) {
    return (
      <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT }}>
        <GlobalStyle />
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Learning path</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Study modules &amp; reviewers</h1>
            <p className="mt-1 text-sm text-gray-500">Select a module below to start and track your progress.</p>
          </header>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviewers.map((item) => {
              const done = progress[item.id] || [];
              const total = item.modules?.length || 0;
              const percent = total ? Math.round((done.length / total) * 100) : 0;
              const minutes = (item.modules || []).reduce((sum, module) => sum + (Number(module.estimatedMinutes) || 15), 0);
              const hasResume = (item.modules || []).some((module) => resume[`${item.id}:${module.id}`]?.scrollTop > 0 && !done.includes(module.id));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openReviewer(item)}
                  className="rp-card rp-focus-ring p-5 text-left transition hover:border-gray-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.subjectCategory || "General"}</p>
                    {hasResume && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Resume</span>}
                  </div>
                  <h2 className="mt-1.5 text-base font-semibold leading-snug text-gray-900">{item.title || "Untitled Reviewer"}</h2>
                  <div className="mt-4 flex items-center justify-between text-xs font-medium text-gray-500">
                    <span>{done.length}/{total} lessons</span>
                    <span className="inline-flex items-center gap-1"><FaClock className="text-[11px]" /> {minutes} min</span>
                  </div>
                  <div className="rp-progress-track mt-2 h-1.5 w-full">
                    <div className="rp-progress-fill h-full" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-gray-600">{percent}% complete</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Single reviewer / module reader ──────────────────────────────────
  const activeResume = resume[`${reviewer.id}:${activeModule.id}`];
  const activeCompleted = completedIds.includes(activeModule.id);
  const videoId = getVideoId(activeModule.videoUrl);
  const activeIndex = modules.findIndex((module) => module.id === activeModule.id);
  const navigateModule = (direction) => selectModule(modules[activeIndex + direction]?.id || activeModule.id);
  const activeStatus = statusFor(activeModule, activeCompleted, activeResume);

  const outline = (
    <aside className="w-full shrink-0 border-b border-gray-200 bg-gray-50 p-4 lg:w-72 lg:border-b-0 lg:border-r lg:overflow-y-auto">
      <button type="button" onClick={() => { setSelectedReviewerId(null); setSelectedModuleId(null); }} className="rp-focus-ring mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
        <FaArrowLeft className="text-xs" /> All reviewers
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{reviewer.subjectCategory || "Learning Path"}</p>
      <h1 className="mt-1 text-lg font-semibold text-gray-900">{reviewer.title}</h1>
      <div className="mt-4">
        <div className="flex justify-between text-xs font-medium text-gray-500">
          <span>Course progress</span><span>{courseProgress}%</span>
        </div>
        <div className="rp-progress-track mt-1.5 h-1.5">
          <div className="rp-progress-fill h-full" style={{ width: `${courseProgress}%` }} />
        </div>
      </div>
      <nav className="mt-5 space-y-1">
        {modules.map((module, index) => {
          const completed = completedIds.includes(module.id);
          const itemResume = resume[`${reviewer.id}:${module.id}`];
          const status = statusFor(module, completed, itemResume);
          const selected = module.id === activeModule.id;
          return (
            <button
              type="button"
              key={module.id}
              onClick={() => selectModule(module.id)}
              className={`rp-module-row rp-focus-ring w-full p-3 text-left ${selected ? "is-active" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${status.tone}`}>{status.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-400">Lesson {index + 1} · {Number(module.estimatedMinutes) || 15} min</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-800">{module.title || `Module ${index + 1}`}</p>
                  {module.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{module.description}</p>}
                  <div className="rp-progress-track mt-1.5 h-1">
                    <div className="rp-progress-fill h-full" style={{ width: `${completed ? 100 : itemResume?.readProgress || 0}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-0 sm:p-6" style={{ fontFamily: FONT }}>
      <GlobalStyle />
      <div className="mx-auto max-w-7xl overflow-hidden rounded-none bg-white sm:rounded-xl sm:border sm:border-gray-200 lg:flex lg:min-h-[calc(100vh-3rem)]">
        <div className="hidden lg:block">{outline}</div>
        <div className="border-b border-gray-200 p-4 lg:hidden">
          <button type="button" onClick={() => setMobileOutlineOpen((open) => !open)} className="rp-btn-secondary rp-focus-ring min-h-11 w-full px-4 text-left text-sm font-semibold">
            {mobileOutlineOpen ? "Hide course outline" : "Show course outline"}
          </button>
          {mobileOutlineOpen && <div className="mt-3">{outline}</div>}
        </div>

        <main
          ref={contentRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            updateResume(activeModule.id, { scrollTop: element.scrollTop, readProgress: Math.round((element.scrollTop / Math.max(1, element.scrollHeight - element.clientHeight)) * 100) });
          }}
          className="min-w-0 flex-1 p-5 sm:p-8 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Lesson {activeIndex + 1} of {modules.length}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeStatus.tone}`}>{activeStatus.label}</span>
            </div>

            <h2 className="mt-2 text-xl font-bold tracking-tight text-gray-900">{activeModule.title || `Module ${activeIndex + 1}`}</h2>
            {activeModule.description && <p className="mt-2 text-sm text-gray-600">{activeModule.description}</p>}

            {activeResume?.scrollTop > 0 && !activeCompleted && (
              <button type="button" onClick={() => { contentRef.current.scrollTop = activeResume.scrollTop; }} className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                Resume reading
              </button>
            )}

            {videoId && (
              <section className="mt-6">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><FaPlayCircle className="text-blue-600" /> Watch first</p>
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-900">
                  <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={activeModule.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </section>
            )}

            <section className="mt-8 border-t border-gray-100 pt-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><FaFileAlt className="text-blue-600" /> Lesson content</div>
              <MathContent content={activeModule.content} />
            </section>

            <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <button type="button" disabled={!activeIndex} onClick={() => navigateModule(-1)} className="rp-btn-secondary rp-focus-ring min-h-11 px-4 text-sm font-semibold">
                  <FaChevronLeft />
                </button>
                <button type="button" disabled={activeIndex === modules.length - 1} onClick={() => navigateModule(1)} className="rp-btn-secondary rp-focus-ring min-h-11 px-4 text-sm font-semibold">
                  Next lesson
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleComplete(activeModule.id)}
                className={`rp-focus-ring min-h-11 rounded-lg px-5 text-sm font-semibold ${activeCompleted ? "bg-emerald-50 text-emerald-800" : "rp-btn-primary"}`}
              >
                {activeCompleted ? "✓ Completed" : "Mark complete"}
              </button>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT }}>
      <GlobalStyle />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <FaBookOpen className="text-3xl text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">No reviewers published yet</h1>
        <p className="mt-2 text-sm text-gray-500">Learning paths will appear here when an admin publishes them.</p>
      </div>
    </div>
  );
}